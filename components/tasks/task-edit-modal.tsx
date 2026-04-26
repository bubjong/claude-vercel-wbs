'use client';

import { useState } from 'react';
import { CloseButton, Dialog, Portal } from '@chakra-ui/react';
import type { InferSelectModel } from 'drizzle-orm';
import { tasks as tasksTable } from '@/lib/db/schema';
import { updateTask, type TaskStatus } from '@/lib/actions/tasks';
import { toaster } from '@/components/ui/toaster';
import { TaskFormFields, type FormState } from './task-form-fields';

type Task = InferSelectModel<typeof tasksTable>;

function taskToFormState(task: Task): FormState {
  return {
    title: task.title,
    description: task.description ?? '',
    assignee: task.assignee ?? '',
    status: (task.status as TaskStatus) ?? 'todo',
    progress: task.progress,
    startDate: task.startDate ?? '',
    dueDate: task.dueDate ?? '',
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
};

export function TaskEditModal({ open, onOpenChange, task }: Props) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(values: FormState) {
    setSubmitting(true);
    const result = await updateTask(task.id, {
      title: values.title,
      description: values.description || null,
      assignee: values.assignee || null,
      status: values.status,
      progress: values.progress,
      startDate: values.startDate || null,
      dueDate: values.dueDate || null,
    });
    setSubmitting(false);

    if (!result.ok) {
      toaster.create({ description: result.error, type: 'error', closable: true });
      return;
    }

    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} size="md">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          {/* task.id + open 조합으로 다른 행 모달 열 때, 또는 닫혔다 열 때 강제 재마운트 */}
          <Dialog.Content key={`${task.id}-${open ? 'open' : 'closed'}`}>
            <Dialog.Header>
              <Dialog.Title>{`"${task.title}" 수정`}</Dialog.Title>
            </Dialog.Header>
            <TaskFormFields
              initialValues={taskToFormState(task)}
              submitting={submitting}
              onSubmit={handleSubmit}
            />
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
