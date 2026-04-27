import 'server-only';

import Papa from 'papaparse';
import { CSV_HEADERS, STATUS_CODE_TO_KO, type TaskStatusCode } from './columns';

export type SerializableTask = {
  id: string;
  parentId: string | null;
  title: string;
  description: string | null;
  assignee: string | null;
  status: string;
  progress: number;
  startDate: string | null;
  dueDate: string | null;
};

const UTF8_BOM = '﻿';

export function serializeTasksToCsv(rows: SerializableTask[]): string {
  const titleById = new Map(rows.map((r) => [r.id, r.title]));

  const data = rows.map((row) => ({
    제목: row.title,
    설명: row.description ?? '',
    담당자: row.assignee ?? '',
    상태: STATUS_CODE_TO_KO[row.status as TaskStatusCode] ?? row.status,
    진행률: String(row.progress),
    시작일: row.startDate ?? '',
    '목표 기한': row.dueDate ?? '',
    '상위 작업 제목': row.parentId ? (titleById.get(row.parentId) ?? '') : '',
  }));

  const csv = Papa.unparse({ fields: [...CSV_HEADERS], data }, { quotes: true, newline: '\r\n' });

  return UTF8_BOM + csv;
}
