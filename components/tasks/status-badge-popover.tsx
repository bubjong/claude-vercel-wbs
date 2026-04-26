'use client';

import { useTransition } from 'react';
import { Menu, Portal } from '@chakra-ui/react';
import { updateTask, type TaskStatus } from '@/lib/actions/tasks';
import { toaster } from '@/components/ui/toaster';
import { StatusBadge } from './status-badge';

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: '할 일' },
  { value: 'doing', label: '진행 중' },
  { value: 'done', label: '완료' },
];

type Props = {
  taskId: string;
  status: string;
};

export function StatusBadgePopover({ taskId, status }: Props) {
  const [pending, startTransition] = useTransition();

  function handleSelect(next: TaskStatus) {
    if (next === status) return;
    startTransition(async () => {
      const result = await updateTask(taskId, { status: next });
      if (!result.ok) {
        toaster.create({ description: result.error, type: 'error', closable: true });
      }
    });
  }

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <button
          type="button"
          aria-label="상태 변경"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            opacity: pending ? 0.6 : 1,
          }}
        >
          <StatusBadge status={status} />
        </button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            {STATUS_OPTIONS.map((option) => (
              <Menu.Item
                key={option.value}
                value={option.value}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
                {option.value === status && ' ✓'}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
