'use client';

import { useState } from 'react';
import { Button, HStack } from '@chakra-ui/react';
import { toaster } from '@/components/ui/toaster';
import { TaskCreateModal } from './task-create-modal';

function notImplemented(featureName: string) {
  toaster.create({
    description: `아직 구현되지 않았습니다. (${featureName} 예정)`,
    type: 'info',
    closable: true,
  });
}

export function TaskListToolbar() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <HStack gap="2" justify="flex-end">
        <Button colorPalette="blue" onClick={() => setCreateOpen(true)}>
          + 작업 추가
        </Button>
        <Button variant="outline" onClick={() => notImplemented('기능 F — CSV 내보내기')}>
          CSV 내보내기
        </Button>
        <Button variant="outline" onClick={() => notImplemented('기능 F — CSV 불러오기')}>
          CSV 불러오기
        </Button>
      </HStack>

      <TaskCreateModal open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
