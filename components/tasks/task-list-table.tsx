'use client';

import { Table } from '@chakra-ui/react';
import type { TaskNode } from '@/lib/tasks/tree';
import { TaskRow } from './task-row';

type Props = {
  nodes: TaskNode[];
  collapsed: ReadonlySet<string>;
  onToggle: (id: string) => void;
};

export function TaskListTable({ nodes, collapsed, onToggle }: Props) {
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
        {nodes.map((node) => (
          <TaskRow
            key={node.task.id}
            task={node.task}
            depth={node.depth}
            hasChildren={node.hasChildren}
            expanded={!collapsed.has(node.task.id)}
            onToggle={() => onToggle(node.task.id)}
          />
        ))}
      </Table.Body>
    </Table.Root>
  );
}
