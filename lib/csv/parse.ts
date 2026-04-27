import 'server-only';

import Papa from 'papaparse';
import { CSV_HEADERS, STATUS_KO_TO_CODE, type TaskStatusCode } from './columns';
import type { ImportPreview, ImportRow } from './types';
import { autoSyncStatusByProgress, isValidDateRange } from '@/lib/db/validation';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateString(v: string): boolean {
  if (!DATE_RE.test(v)) return false;
  // 2026-02-30 같은 무효 날짜를 거른다 — 같은 문자열로 round-trip 되는지로 검사.
  const d = new Date(v + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return false;
  const y = d.getUTCFullYear().toString().padStart(4, '0');
  const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = d.getUTCDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}` === v;
}

function normalizeStatus(raw: string): TaskStatusCode {
  return STATUS_KO_TO_CODE[raw.trim()] ?? 'todo';
}

function normalizeProgress(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  const i = Math.trunc(n);
  if (i < 0) return 0;
  if (i > 100) return 100;
  return i;
}

function emptyToNull(s: string | undefined): string | null {
  if (s === undefined) return null;
  const t = s.trim();
  return t === '' ? null : t;
}

export function parseImportCsv(text: string, existingTopTitles: Set<string>): ImportPreview {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const rejected: ImportPreview['rejected'] = [];
  const warnings: ImportPreview['warnings'] = [];
  const valid: { row: number; normalized: ImportRow }[] = [];

  // 헤더 검증: 필수 헤더가 누락되면 모든 행이 무의미하므로 빈 결과 + 경고 1개를 돌려준다.
  const fields = result.meta.fields ?? [];
  const missingHeaders = (CSV_HEADERS as readonly string[]).filter((h) => !fields.includes(h));
  if (missingHeaders.length > 0) {
    return {
      rowsToInsert: [],
      rejected: [],
      warnings: [
        {
          row: 1,
          message: `CSV 헤더가 올바르지 않습니다. 누락: ${missingHeaders.join(', ')}`,
        },
      ],
    };
  }

  result.data.forEach((raw, idx) => {
    const row = idx + 2; // 1행은 헤더 → 데이터 첫 행은 2행

    const title = (raw['제목'] ?? '').trim();
    if (title === '') {
      rejected.push({ row, reason: '제목 누락' });
      return;
    }

    const description = emptyToNull(raw['설명']);
    const assignee = emptyToNull(raw['담당자']);
    const status = normalizeStatus(raw['상태'] ?? '');
    const progress = normalizeProgress(raw['진행률'] ?? '0');

    const startRaw = (raw['시작일'] ?? '').trim();
    const dueRaw = (raw['목표 기한'] ?? '').trim();
    const startDate = startRaw === '' ? null : isValidDateString(startRaw) ? startRaw : null;
    let dueDate = dueRaw === '' ? null : isValidDateString(dueRaw) ? dueRaw : null;
    if (!isValidDateRange(startDate, dueDate)) {
      // 시작일 이전이면 graceful degradation — 목표 기한만 비운다.
      dueDate = null;
    }

    const finalStatus = autoSyncStatusByProgress(status, progress);
    const parentTitle = emptyToNull(raw['상위 작업 제목']);

    valid.push({
      row,
      normalized: {
        title,
        description,
        assignee,
        status: finalStatus,
        progress,
        startDate,
        dueDate,
        parentTitle,
      },
    });
  });

  // 부모 매칭: 같은 CSV 안에서 최상위가 되는(=parentTitle이 null) 행 제목을 모은다.
  const csvTopTitles = new Set(
    valid.filter((v) => v.normalized.parentTitle === null).map((v) => v.normalized.title)
  );

  const rowsToInsert: ImportRow[] = valid.map(({ row, normalized }) => {
    if (normalized.parentTitle === null) return normalized;
    if (existingTopTitles.has(normalized.parentTitle)) return normalized;
    if (csvTopTitles.has(normalized.parentTitle)) return normalized;
    warnings.push({ row, message: '상위 매칭 실패 → 최상위로 처리' });
    return { ...normalized, parentTitle: null };
  });

  return { rowsToInsert, rejected, warnings };
}
