'use client';

import { useRef, useState, useTransition } from 'react';
import { Button, HStack } from '@chakra-ui/react';
import { toaster } from '@/components/ui/toaster';
import { exportTasksCsv } from '@/lib/actions/csv';
import { TaskCreateModal } from './task-create-modal';
import { CsvImportDialog } from './csv-import-dialog';

export function TaskListToolbar() {
  const [createOpen, setCreateOpen] = useState(false);
  const [exporting, startExport] = useTransition();
  const [importText, setImportText] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 같은 파일을 다시 골라도 onChange가 발화하도록 value 리셋
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      setImportText(text);
    } catch {
      toaster.create({
        description: '파일을 읽지 못했습니다.',
        type: 'error',
        closable: true,
      });
    }
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
        <Button variant="outline" onClick={handleImportClick}>
          CSV 불러오기
        </Button>
      </HStack>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
        data-testid="csv-import-file-input"
      />

      <TaskCreateModal open={createOpen} onOpenChange={setCreateOpen} />
      <CsvImportDialog
        text={importText}
        onOpenChange={(open) => {
          if (!open) setImportText(null);
        }}
      />
    </>
  );
}
