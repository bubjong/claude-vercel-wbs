'use client';

import { useState } from 'react';
import { Table } from '@chakra-ui/react';
import type { TaskNode } from '@/lib/tasks/tree';
import { TaskRow } from './task-row';

export function TaskListTable({ nodes }: { nodes: TaskNode[] }) {
  // 펼침 상태는 메모리만(SPEC §5 E-2). 기본 모두 펼침. 새로고침 시 초기화.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    // React Strict Mode가 dev에서 updater를 두 번 호출해도 idempotent해야 하므로
    // functional updater 안에서 has-check + add/delete를 하지 않고,
    // 외부에서 결정한 다음 새 Set을 그대로 set.
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCollapsed(next);
  }

  // 가시 행 계산: collapsed 노드의 자손은 skip. nodes는 DFS 순서이므로 한 번에 처리.
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

  return (
    <Table.Root size="sm" variant="line">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>제목</Table.ColumnHeader>
          <Table.ColumnHeader>담당자</Table.ColumnHeader>
          <Table.ColumnHeader>상태</Table.ColumnHeader>
          <Table.ColumnHeader>진행률</Table.ColumnHeader>
          <Table.ColumnHeader>기간</Table.ColumnHeader>
          <Table.ColumnHeader width="8" />
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {visible.map((node) => (
          <TaskRow
            key={node.task.id}
            task={node.task}
            depth={node.depth}
            hasChildren={node.hasChildren}
            expanded={!collapsed.has(node.task.id)}
            onToggle={() => toggle(node.task.id)}
          />
        ))}
      </Table.Body>
    </Table.Root>
  );
}
