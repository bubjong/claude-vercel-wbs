import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import type { CreateTaskInput } from '@/lib/actions/tasks';

export async function truncateTasks() {
  await db.delete(tasks);
}

// 테스트에서 부모 행 등을 사전에 직접 DB로 시드한다 (Server Action을 거치지 않음).
// 자동 동기화·검증 로직을 우회해 정확한 초기 상태를 만들 때 유용.
export async function seedTask(input: Omit<CreateTaskInput, 'parentId'> & { parentId?: string }) {
  const [row] = await db
    .insert(tasks)
    .values({
      title: input.title,
      description: input.description ?? null,
      assignee: input.assignee ?? null,
      status: input.status ?? 'todo',
      progress: input.progress ?? 0,
      startDate: input.startDate ?? null,
      dueDate: input.dueDate ?? null,
      parentId: input.parentId ?? null,
    })
    .returning({ id: tasks.id });
  return row;
}
