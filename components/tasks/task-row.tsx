'use client';

import { useState } from 'react';
import { HStack, Progress, Table, Text } from '@chakra-ui/react';
import type { InferSelectModel } from 'drizzle-orm';
import { tasks as tasksTable } from '@/lib/db/schema';
import { StatusBadgePopover } from './status-badge-popover';
import { TaskEditModal } from './task-edit-modal';
import { TaskRowMenu } from './task-row-menu';

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

export function TaskRow({ task }: { task: Task }) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <Table.Row onClick={() => setEditOpen(true)} cursor="pointer" _hover={{ bg: 'bg.muted' }}>
        <Table.Cell>{task.title}</Table.Cell>
        <Table.Cell>{task.assignee ?? '—'}</Table.Cell>
        {/* 배지·⋯ 메뉴 셀은 자체 onClick이 행 클릭으로 bubble되지 않도록 stopPropagation */}
        <Table.Cell onClick={(e) => e.stopPropagation()}>
          <StatusBadgePopover taskId={task.id} status={task.status} />
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
        <Table.Cell textAlign="end" onClick={(e) => e.stopPropagation()}>
          <TaskRowMenu task={task} />
        </Table.Cell>
      </Table.Row>

      <TaskEditModal task={task} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
