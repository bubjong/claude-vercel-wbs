// 클라이언트·서버 공유 가능. papaparse 의존 없음.

import type { TaskStatusCode } from './columns';

export type ImportRow = {
  title: string;
  description: string | null;
  assignee: string | null;
  status: TaskStatusCode;
  progress: number;
  startDate: string | null;
  dueDate: string | null;
  parentTitle: string | null;
};

export type ImportRejected = { row: number; reason: string };
export type ImportWarning = { row: number; message: string };

export type ImportPreview = {
  rowsToInsert: ImportRow[];
  rejected: ImportRejected[];
  warnings: ImportWarning[];
};
