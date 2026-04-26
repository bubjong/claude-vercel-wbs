import { Table } from '@chakra-ui/react';
import type { InferSelectModel } from 'drizzle-orm';
import { tasks as tasksTable } from '@/lib/db/schema';
import { TaskRow } from './task-row';

type Task = InferSelectModel<typeof tasksTable>;

export function TaskListTable({ tasks }: { tasks: Task[] }) {
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
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </Table.Body>
    </Table.Root>
  );
}
