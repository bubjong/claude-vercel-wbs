'use client';

import { useState } from 'react';
import { IconButton, Menu, Portal } from '@chakra-ui/react';
import type { InferSelectModel } from 'drizzle-orm';
import { tasks as tasksTable } from '@/lib/db/schema';
import { TaskCreateModal } from './task-create-modal';
import { TaskDeleteDialog } from './task-delete-dialog';

type Task = InferSelectModel<typeof tasksTable>;

export function TaskRowMenu({ task }: { task: Task }) {
  const [addSubOpen, setAddSubOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // 깊이 제한 (SPEC.md §5 E-3): 자식 행에서는 "하위 작업 추가" 항목만 숨긴다.
  // "삭제"는 부모/자식 모두 노출된다 (SPEC.md §4 D-1).
  const canAddSubtask = task.parentId === null;

  return (
    <>
      <Menu.Root>
        <Menu.Trigger asChild>
          <IconButton variant="ghost" size="sm" aria-label={`${task.title} 작업 메뉴`}>
            ⋯
          </IconButton>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content>
              {canAddSubtask && (
                <Menu.Item value="add-subtask" onClick={() => setAddSubOpen(true)}>
                  하위 작업 추가
                </Menu.Item>
              )}
              <Menu.Item value="delete" color="fg.error" onClick={() => setDeleteOpen(true)}>
                삭제
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>

      {canAddSubtask && (
        <TaskCreateModal
          open={addSubOpen}
          onOpenChange={setAddSubOpen}
          parentId={task.id}
          parentTitle={task.title}
        />
      )}

      <TaskDeleteDialog
        taskId={task.id}
        taskTitle={task.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
