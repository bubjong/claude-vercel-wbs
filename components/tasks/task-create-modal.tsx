'use client';

import { useState } from 'react';
import { CloseButton, Dialog, Portal } from '@chakra-ui/react';
import { createTask } from '@/lib/actions/tasks';
import { toaster } from '@/components/ui/toaster';
import { EMPTY_FORM_STATE, TaskFormFields, type FormState } from './task-form-fields';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId?: string;
  parentTitle?: string;
};

export function TaskCreateModal({ open, onOpenChange, parentId, parentTitle }: Props) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(values: FormState) {
    setSubmitting(true);
    const result = await createTask({
      title: values.title,
      description: values.description || undefined,
      assignee: values.assignee || undefined,
      status: values.status,
      progress: values.progress,
      startDate: values.startDate || undefined,
      dueDate: values.dueDate || undefined,
      parentId,
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
          {/* key 변경으로 모달 열고 닫을 때마다 폼 강제 재마운트 → 자연스러운 reset */}
          <Dialog.Content key={open ? 'open' : 'closed'}>
            <Dialog.Header>
              <Dialog.Title>
                {parentTitle ? `"${parentTitle}"의 하위 작업 추가` : '새 작업 추가'}
              </Dialog.Title>
            </Dialog.Header>
            <TaskFormFields
              initialValues={EMPTY_FORM_STATE}
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
