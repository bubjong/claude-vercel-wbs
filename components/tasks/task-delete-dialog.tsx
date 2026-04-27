'use client';

import { useEffect, useState, useTransition } from 'react';
import { Button, CloseButton, Dialog, HStack, Portal, Text } from '@chakra-ui/react';
import { deleteTask, getDirectChildCount } from '@/lib/actions/tasks';
import { toaster } from '@/components/ui/toaster';

type Props = {
  taskId: string;
  taskTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TaskDeleteDialog({ taskId, taskTitle, open, onOpenChange }: Props) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      size="sm"
      role="alertdialog"
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <DeleteDialogBody
              taskId={taskId}
              taskTitle={taskTitle}
              onClose={() => onOpenChange(false)}
            />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

// 본문은 lazyMount/unmountOnExit 로 다이얼로그가 열릴 때만 마운트된다.
// 덕분에 자식 수 조회 effect 가 매 오픈마다 깨끗한 상태에서 다시 시작한다.
function DeleteDialogBody({
  taskId,
  taskTitle,
  onClose,
}: {
  taskId: string;
  taskTitle: string;
  onClose: () => void;
}) {
  const [childCount, setChildCount] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void getDirectChildCount(taskId).then((n) => {
      if (!cancelled) setChildCount(n);
    });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTask(taskId);
      if (!result.ok) {
        toaster.create({ description: result.error, type: 'error', closable: true });
        return;
      }
      onClose();
    });
  }

  const message =
    childCount === null
      ? '확인 중…'
      : childCount === 0
        ? '이 작업을 삭제합니다. 계속할까요?'
        : `이 작업과 하위 작업 ${childCount}개가 모두 삭제됩니다. 계속할까요?`;

  return (
    <>
      <Dialog.Header>
        <Dialog.Title>{`"${taskTitle}" 삭제`}</Dialog.Title>
      </Dialog.Header>
      <Dialog.Body>
        <Text>{message}</Text>
      </Dialog.Body>
      <Dialog.Footer>
        <HStack gap="2" justify="flex-end">
          <Dialog.ActionTrigger asChild>
            <Button variant="ghost" disabled={pending}>
              취소
            </Button>
          </Dialog.ActionTrigger>
          <Button colorPalette="red" onClick={handleDelete} loading={pending}>
            삭제
          </Button>
        </HStack>
      </Dialog.Footer>
      <Dialog.CloseTrigger asChild>
        <CloseButton size="sm" />
      </Dialog.CloseTrigger>
    </>
  );
}
