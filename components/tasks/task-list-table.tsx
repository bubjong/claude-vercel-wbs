import { HStack, Progress, Table, Text } from '@chakra-ui/react';
import type { InferSelectModel } from 'drizzle-orm';
import { tasks as tasksTable } from '@/lib/db/schema';
import { StatusBadge } from './status-badge';

type Task = InferSelectModel<typeof tasksTable>;

function formatMD(s: string | null): string | null {
  if (!s) return null;
  const [, mm, dd] = s.split('-');
  return `${Number(mm)}/${Number(dd)}`;
}

function formatRange(start: string | null, due: string | null): string {
  const s = formatMD(start);
  const d = formatMD(due);
  if (!s && !d) return '—';
  return `${s ?? '—'} ~ ${d ?? '—'}`;
}

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
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {tasks.map((task) => (
          <Table.Row key={task.id}>
            <Table.Cell>{task.title}</Table.Cell>
            <Table.Cell>{task.assignee ?? '—'}</Table.Cell>
            <Table.Cell>
              <StatusBadge status={task.status} />
            </Table.Cell>
            <Table.Cell>
              <HStack gap="2">
                <Text fontSize="sm" minW="3.5ch">
                  {task.progress}%
                </Text>
                <Progress.Root value={task.progress} size="xs" maxW="80px" flex="1">
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              </HStack>
            </Table.Cell>
            <Table.Cell>{formatRange(task.startDate, task.dueDate)}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
