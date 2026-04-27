'use client';

import { useState } from 'react';
import { filterVisible, type TaskNode } from '@/lib/tasks/tree';
import { TaskListEmpty } from './task-list-empty';
import { TaskListGantt } from './task-list-gantt';
import { TaskListTable } from './task-list-table';
import { TaskListToolbar } from './task-list-toolbar';

export type TaskView = 'list' | 'gantt';

export function TaskViewContainer({ nodes }: { nodes: TaskNode[] }) {
  const [view, setView] = useState<TaskView>('list');

  // 펼침 상태는 메모리만 (SPEC §5 E-2). 두 뷰가 공유하므로 컨테이너에서 보유.
  // 새로고침 시 초기화. 기본 모두 펼침.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    const next = new Set(collapsed);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setCollapsed(next);
  }

  const visibleNodes = filterVisible(nodes, collapsed);

  return (
    <>
      <TaskListToolbar view={view} onViewChange={setView} taskCount={nodes.length} />
      {nodes.length === 0 ? (
        <TaskListEmpty />
      ) : view === 'list' ? (
        <TaskListTable nodes={visibleNodes} collapsed={collapsed} onToggle={toggle} />
      ) : (
        <TaskListGantt nodes={visibleNodes} collapsed={collapsed} onToggle={toggle} />
      )}
    </>
  );
}
