'use client';

import { useState } from 'react';
import { Badge, HStack, Progress, Table, Text } from '@chakra-ui/react';
import type { InferSelectModel } from 'drizzle-orm';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { tasks as tasksTable } from '@/lib/db/schema';
import { isOverdue } from '@/lib/gantt/date-grid';
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

const INDENT_PX = 24;

type Props = {
  task: Task;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  onToggle: () => void;
};

export function TaskRow({ task, depth, hasChildren, expanded, onToggle }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <>
      <Table.Row
        onClick={() => setEditOpen(true)}
        cursor="pointer"
        _hover={{ bg: 'bg.muted' }}
        data-overdue={overdue ? 'true' : 'false'}
      >
        <Table.Cell>
          <HStack gap="2" pl={`${depth * INDENT_PX}px`}>
            {hasChildren ? (
              <button
                type="button"
                aria-label={expanded ? '접기' : '펼치기'}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  width: '1rem',
                  height: '1rem',
                }}
              >
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              // 자식이 없으면 같은 폭의 spacer로 정렬 유지
              <span style={{ width: '1rem', display: 'inline-block' }} />
            )}
            <span>{task.title}</span>
          </HStack>
        </Table.Cell>
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
        <Table.Cell>
          <HStack gap="2">
            <Text color={overdue ? 'red.600' : undefined} fontSize="sm">
              {formatRange(task.startDate, task.dueDate)}
            </Text>
            {overdue && (
              <Badge colorPalette="red" size="sm" data-testid="overdue-badge">
                지남
              </Badge>
            )}
          </HStack>
        </Table.Cell>
        <Table.Cell textAlign="end" onClick={(e) => e.stopPropagation()}>
          <TaskRowMenu task={task} />
        </Table.Cell>
      </Table.Row>

      <TaskEditModal task={task} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
