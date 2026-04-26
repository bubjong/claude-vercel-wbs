'use client';

import { useState } from 'react';
import { IconButton, Menu, Portal } from '@chakra-ui/react';
import type { InferSelectModel } from 'drizzle-orm';
import { tasks as tasksTable } from '@/lib/db/schema';
import { TaskCreateModal } from './task-create-modal';

type Task = InferSelectModel<typeof tasksTable>;

export function TaskRowMenu({ task }: { task: Task }) {
  const [addSubOpen, setAddSubOpen] = useState(false);

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
              <Menu.Item value="add-subtask" onClick={() => setAddSubOpen(true)}>
                하위 작업 추가
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>

      <TaskCreateModal
        open={addSubOpen}
        onOpenChange={setAddSubOpen}
        parentId={task.id}
        parentTitle={task.title}
      />
    </>
  );
}
