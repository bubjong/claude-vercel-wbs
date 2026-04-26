'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';

export type TaskStatus = 'todo' | 'doing' | 'done';

export type CreateTaskInput = {
  title: string;
  description?: string;
  assignee?: string;
  status?: TaskStatus;
  progress?: number;
  startDate?: string; // 'YYYY-MM-DD'
  dueDate?: string; // 'YYYY-MM-DD'
  parentId?: string;
};

export type CreateTaskResult = { ok: true; taskId: string } | { ok: false; error: string };

export async function createTask(input: CreateTaskInput): Promise<CreateTaskResult> {
  const title = input.title?.trim();
  if (!title) {
    return { ok: false, error: '제목은 필수입니다.' };
  }

  if (input.startDate && input.dueDate && input.dueDate < input.startDate) {
    return { ok: false, error: '목표 기한은 시작일 이후여야 합니다.' };
  }

  const progress = input.progress ?? 0;
  if (progress < 0 || progress > 100) {
    return { ok: false, error: '진행률은 0과 100 사이여야 합니다.' };
  }

  // 자동 동기화: 진행률 100% 입력 시 상태를 'done'으로 강제 (SPEC.md §2 B·C 공통).
  const status: TaskStatus = progress >= 100 ? 'done' : (input.status ?? 'todo');

  const [row] = await db
    .insert(tasks)
    .values({
      title,
      description: input.description?.trim() || null,
      assignee: input.assignee?.trim() || null,
      status,
      progress,
      startDate: input.startDate || null,
      dueDate: input.dueDate || null,
      parentId: input.parentId || null,
    })
    .returning({ id: tasks.id });

  revalidatePath('/');

  return { ok: true, taskId: row.id };
}
