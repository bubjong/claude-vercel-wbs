'use server';

import { revalidatePath } from 'next/cache';
import { asc, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { serializeTasksToCsv } from '@/lib/csv/serialize';
import { parseImportCsv } from '@/lib/csv/parse';
import type { ImportPreview, ImportRow } from '@/lib/csv/types';

export type ExportTasksCsvResult = { filename: string; content: string };

function todayInKstYmd(): string {
  // KST(Asia/Seoul) 기준 YYYY-MM-DD. 서버 시각이 UTC여도 한국 자정 기준으로 일자가 바뀌도록.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  const d = parts.find((p) => p.type === 'day')!.value;
  return `${y}-${m}-${d}`;
}

export async function exportTasksCsv(): Promise<ExportTasksCsvResult> {
  const rows = await db.select().from(tasks).orderBy(asc(tasks.createdAt));

  const content = serializeTasksToCsv(rows);
  const filename = `wbs-${todayInKstYmd()}.csv`;

  return { filename, content };
}

// 동명 최상위가 여러 개면 가장 먼저 만들어진 것을 우선 (SPEC.md §F-1)
async function loadExistingTopTitleMap(): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: tasks.id, title: tasks.title })
    .from(tasks)
    .where(isNull(tasks.parentId))
    .orderBy(asc(tasks.createdAt));

  const map = new Map<string, string>();
  for (const r of rows) {
    if (!map.has(r.title)) map.set(r.title, r.id);
  }
  return map;
}

export async function previewImportCsv(text: string): Promise<ImportPreview> {
  const titleToId = await loadExistingTopTitleMap();
  return parseImportCsv(text, new Set(titleToId.keys()));
}

export type ApplyImportCsvResult = { inserted: number };

export async function applyImportCsv(rows: ImportRow[]): Promise<ApplyImportCsvResult> {
  if (rows.length === 0) return { inserted: 0 };

  const existingTopByTitle = await loadExistingTopTitleMap();

  // 1차: parentTitle === null 인 행 (최상위) 일괄 INSERT
  const topRows = rows.filter((r) => r.parentTitle === null);
  const childRows = rows.filter((r) => r.parentTitle !== null);

  let inserted = 0;

  await db.transaction(async (tx) => {
    const newTopByTitle = new Map<string, string>();

    if (topRows.length > 0) {
      const inserted1 = await tx
        .insert(tasks)
        .values(
          topRows.map((r) => ({
            title: r.title,
            description: r.description,
            assignee: r.assignee,
            status: r.status,
            progress: r.progress,
            startDate: r.startDate,
            dueDate: r.dueDate,
            parentId: null,
          }))
        )
        .returning({ id: tasks.id, title: tasks.title });

      for (const row of inserted1) {
        if (!newTopByTitle.has(row.title)) newTopByTitle.set(row.title, row.id);
      }
      inserted += inserted1.length;
    }

    if (childRows.length > 0) {
      const childValues = childRows.map((r) => {
        const parentId =
          (r.parentTitle && existingTopByTitle.get(r.parentTitle)) ||
          (r.parentTitle && newTopByTitle.get(r.parentTitle)) ||
          null;
        return {
          title: r.title,
          description: r.description,
          assignee: r.assignee,
          status: r.status,
          progress: r.progress,
          startDate: r.startDate,
          dueDate: r.dueDate,
          parentId,
        };
      });

      const inserted2 = await tx.insert(tasks).values(childValues).returning({ id: tasks.id });
      inserted += inserted2.length;
    }
  });

  revalidatePath('/');
  return { inserted };
}
