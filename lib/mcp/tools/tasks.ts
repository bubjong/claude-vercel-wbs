import { z } from 'zod';
import { asc, eq } from 'drizzle-orm';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { createTask, updateTask, deleteTask } from '@/lib/actions/tasks';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이어야 합니다.');

export const listTasksInputShape = {} as const;

export const getTaskInputShape = {
  id: z.string().uuid(),
} as const;

export const createTaskInputShape = {
  title: z.string().min(1),
  description: z.string().optional(),
  assignee: z.string().optional(),
  status: z.enum(['todo', 'doing', 'done']).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  startDate: isoDate.optional(),
  dueDate: isoDate.optional(),
  parentId: z.string().uuid().optional(),
} as const;

export const updateTaskInputShape = {
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  assignee: z.string().nullable().optional(),
  status: z.enum(['todo', 'doing', 'done']).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  startDate: isoDate.nullable().optional(),
  dueDate: isoDate.nullable().optional(),
} as const;

export const deleteTaskInputShape = {
  id: z.string().uuid(),
} as const;

export type ListTasksInput = Record<string, never>;
export type GetTaskInput = { id: string };
export type CreateTaskToolInput = {
  title: string;
  description?: string;
  assignee?: string;
  status?: 'todo' | 'doing' | 'done';
  progress?: number;
  startDate?: string;
  dueDate?: string;
  parentId?: string;
};
export type UpdateTaskToolInput = {
  id: string;
  title?: string;
  description?: string | null;
  assignee?: string | null;
  status?: 'todo' | 'doing' | 'done';
  progress?: number;
  startDate?: string | null;
  dueDate?: string | null;
};
export type DeleteTaskInput = { id: string };

function textResult(payload: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
  };
}

function errorResult(message: string): CallToolResult {
  return {
    isError: true,
    content: [{ type: 'text', text: message }],
  };
}

export async function listTasks(): Promise<CallToolResult> {
  const rows = await db.select().from(tasks).orderBy(asc(tasks.createdAt));
  return textResult(rows);
}

export async function getTask(input: GetTaskInput): Promise<CallToolResult> {
  const [row] = await db.select().from(tasks).where(eq(tasks.id, input.id));
  if (!row) return errorResult('Task not found');
  return textResult(row);
}

export async function createTaskTool(input: CreateTaskToolInput): Promise<CallToolResult> {
  const result = await createTask(input);
  if (!result.ok) return errorResult(result.error);
  const [row] = await db.select().from(tasks).where(eq(tasks.id, result.taskId));
  return textResult(row);
}

export async function updateTaskTool(input: UpdateTaskToolInput): Promise<CallToolResult> {
  const { id, ...patch } = input;
  const result = await updateTask(id, patch);
  if (!result.ok) return errorResult(result.error);
  const [row] = await db.select().from(tasks).where(eq(tasks.id, id));
  return textResult(row);
}

export async function deleteTaskTool(input: DeleteTaskInput): Promise<CallToolResult> {
  const result = await deleteTask(input.id);
  if (!result.ok) return errorResult(result.error);
  return textResult({ ok: true, id: input.id });
}
