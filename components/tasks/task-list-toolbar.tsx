'use client';

import { useState, useTransition } from 'react';
import { Button, HStack } from '@chakra-ui/react';
import { toaster } from '@/components/ui/toaster';
import { exportTasksCsv } from '@/lib/actions/csv';
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
  const [exporting, startExport] = useTransition();

  const handleExport = () => {
    startExport(async () => {
      try {
        const { filename, content } = await exportTasksCsv();
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        toaster.create({
          description: 'CSV 내보내기에 실패했습니다.',
          type: 'error',
          closable: true,
        });
      }
    });
  };

  return (
    <>
      <HStack gap="2" justify="flex-end">
        <Button colorPalette="blue" onClick={() => setCreateOpen(true)}>
          + 작업 추가
        </Button>
        <Button variant="outline" onClick={handleExport} loading={exporting}>
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
