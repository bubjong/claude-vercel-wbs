'use client';

import { useState } from 'react';
import type { TaskNode } from '@/lib/tasks/tree';
import { TaskListEmpty } from './task-list-empty';
import { TaskListGantt } from './task-list-gantt';
import { TaskListTable } from './task-list-table';
import { TaskListToolbar } from './task-list-toolbar';

export type TaskView = 'list' | 'gantt';

export function TaskViewContainer({ nodes }: { nodes: TaskNode[] }) {
  const [view, setView] = useState<TaskView>('list');

  return (
    <>
      <TaskListToolbar view={view} onViewChange={setView} taskCount={nodes.length} />
      {nodes.length === 0 ? (
        <TaskListEmpty />
      ) : view === 'list' ? (
        <TaskListTable nodes={nodes} />
      ) : (
        <TaskListGantt nodes={nodes} />
      )}
    </>
  );
}
