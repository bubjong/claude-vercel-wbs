'use server';

import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { serializeTasksToCsv } from '@/lib/csv/serialize';

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
