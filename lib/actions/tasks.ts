'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
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

// 부분 업데이트: 들어온 키만 set. null 명시는 비우기, undefined는 변경 없음.
export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  assignee?: string | null;
  status?: TaskStatus;
  progress?: number;
  startDate?: string | null;
  dueDate?: string | null;
};

export type CreateTaskResult = { ok: true; taskId: string } | { ok: false; error: string };
export type UpdateTaskResult = { ok: true } | { ok: false; error: string };

type CommonInput = {
  title?: string;
  startDate?: string | null;
  dueDate?: string | null;
  progress?: number;
  status?: TaskStatus;
};

// 공통 검증: 들어온 값에 대해서만 규칙 적용. createTask는 title 필수, updateTask는 들어왔을 때만.
function validateTaskInput(input: CommonInput): { ok: true } | { ok: false; error: string } {
  if (input.title !== undefined && input.title.trim() === '') {
    return { ok: false, error: '제목은 필수입니다.' };
  }
  if (input.startDate && input.dueDate && input.dueDate < input.startDate) {
    return { ok: false, error: '목표 기한은 시작일 이후여야 합니다.' };
  }
  if (input.progress !== undefined) {
    if (Number.isNaN(input.progress) || input.progress < 0 || input.progress > 100) {
      return { ok: false, error: '진행률은 0과 100 사이여야 합니다.' };
    }
  }
  return { ok: true };
}

// 자동 동기화 (SPEC.md §2 B-4 — B·C 공통): progress가 100 이상이면 status를 'done'으로 강제.
function applyAutoSync<T extends CommonInput>(input: T): T {
  if (input.progress !== undefined && input.progress >= 100) {
    return { ...input, status: 'done' };
  }
  return input;
}

export async function createTask(input: CreateTaskInput): Promise<CreateTaskResult> {
  if (!input.title || input.title.trim() === '') {
    return { ok: false, error: '제목은 필수입니다.' };
  }

  const validation = validateTaskInput(input);
  if (!validation.ok) return validation;

  // 깊이 제한 (SPEC.md §5 E-3): 부모가 이미 자식이면 손자가 되므로 거부.
  if (input.parentId) {
    const [parent] = await db
      .select({ parentId: tasks.parentId })
      .from(tasks)
      .where(eq(tasks.id, input.parentId));
    if (!parent) {
      return { ok: false, error: '상위 작업을 찾을 수 없습니다.' };
    }
    if (parent.parentId !== null) {
      return { ok: false, error: '하위 작업은 한 단계까지만 만들 수 있습니다.' };
    }
  }

  const synced = applyAutoSync(input);

  const [row] = await db
    .insert(tasks)
    .values({
      title: synced.title!.trim(),
      description: input.description?.trim() || null,
      assignee: input.assignee?.trim() || null,
      status: synced.status ?? 'todo',
      progress: synced.progress ?? 0,
      startDate: input.startDate || null,
      dueDate: input.dueDate || null,
      parentId: input.parentId || null,
    })
    .returning({ id: tasks.id });

  revalidatePath('/');
  return { ok: true, taskId: row.id };
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<UpdateTaskResult> {
  const validation = validateTaskInput(input);
  if (!validation.ok) return validation;

  const synced = applyAutoSync(input);

  // 들어온 키만 patch에 포함시킨다.
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (synced.title !== undefined) patch.title = synced.title.trim();
  if (synced.description !== undefined) {
    patch.description = synced.description ? synced.description.trim() || null : null;
  }
  if (synced.assignee !== undefined) {
    patch.assignee = synced.assignee ? synced.assignee.trim() || null : null;
  }
  if (synced.status !== undefined) patch.status = synced.status;
  if (synced.progress !== undefined) patch.progress = synced.progress;
  if (synced.startDate !== undefined) patch.startDate = synced.startDate || null;
  if (synced.dueDate !== undefined) patch.dueDate = synced.dueDate || null;

  await db.update(tasks).set(patch).where(eq(tasks.id, id));

  revalidatePath('/');
  return { ok: true };
}
