import type { InferSelectModel } from 'drizzle-orm';
import type { tasks as tasksTable } from '@/lib/db/schema';

type Task = InferSelectModel<typeof tasksTable>;

export type TaskNode = {
  task: Task;
  depth: number;
  hasChildren: boolean;
};

// 평면 Task[] → DFS로 트리 정렬한 TaskNode[].
// 부모 → 그 자식들 → 다음 부모 순서. 같은 부모의 형제는 createdAt 오름차순.
// SPEC.md §5 E-3 (현행: 최대 1단계) 기준이라도 함수 자체는 임의 깊이를 처리.
export function flattenTaskTree(rows: Task[]): TaskNode[] {
  const childrenOf = new Map<string | null, Task[]>();
  for (const t of rows) {
    const list = childrenOf.get(t.parentId) ?? [];
    list.push(t);
    childrenOf.set(t.parentId, list);
  }

  for (const list of childrenOf.values()) {
    list.sort((a, b) => {
      if (a.createdAt < b.createdAt) return -1;
      if (a.createdAt > b.createdAt) return 1;
      return 0;
    });
  }

  const result: TaskNode[] = [];
  function walk(parentId: string | null, depth: number) {
    const children = childrenOf.get(parentId) ?? [];
    for (const t of children) {
      const grand = childrenOf.get(t.id) ?? [];
      result.push({ task: t, depth, hasChildren: grand.length > 0 });
      walk(t.id, depth + 1);
    }
  }
  walk(null, 0);
  return result;
}
