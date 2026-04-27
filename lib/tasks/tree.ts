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

// DFS 순서의 TaskNode[]에서 collapsed에 들어 있는 부모의 자손을 걷어낸 가시 행을 반환.
// nodes는 flattenTaskTree가 만든 DFS 순서임을 가정 — 자손은 부모보다 depth가 크고 부모 직후 연속해서 나타나므로 한 번의 선형 스캔으로 처리 가능.
export function filterVisible(nodes: TaskNode[], collapsed: ReadonlySet<string>): TaskNode[] {
  const visible: TaskNode[] = [];
  let collapsedDepth: number | null = null;
  for (const node of nodes) {
    if (collapsedDepth !== null) {
      if (node.depth > collapsedDepth) continue;
      collapsedDepth = null;
    }
    visible.push(node);
    if (collapsed.has(node.task.id)) {
      collapsedDepth = node.depth;
    }
  }
  return visible;
}
