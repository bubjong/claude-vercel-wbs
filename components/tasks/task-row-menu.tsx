'use client';

import { useState } from 'react';
import { IconButton, Menu, Portal } from '@chakra-ui/react';
import type { InferSelectModel } from 'drizzle-orm';
import { tasks as tasksTable } from '@/lib/db/schema';
import { TaskCreateModal } from './task-create-modal';

type Task = InferSelectModel<typeof tasksTable>;

export function TaskRowMenu({ task }: { task: Task }) {
  const [addSubOpen, setAddSubOpen] = useState(false);

  // 깊이 제한 (SPEC.md §5 E-3, 최대 1단계): 자식 행은 더 이상 하위 작업을 가질 수 없으므로
  // "하위 작업 추가" 항목이 유일한 메뉴 항목인 현 시점에선 메뉴 자체를 노출하지 않는다.
  // 추후 D(삭제) 등 새 항목이 추가되면 이 분기 재검토.
  if (task.parentId !== null) {
    return null;
  }

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
