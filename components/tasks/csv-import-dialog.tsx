'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  Box,
  Button,
  CloseButton,
  Dialog,
  HStack,
  Heading,
  List,
  Portal,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import { applyImportCsv, previewImportCsv } from '@/lib/actions/csv';
import type { ImportPreview } from '@/lib/csv/types';
import { toaster } from '@/components/ui/toaster';

type Props = {
  text: string | null; // null이면 닫힌 상태
  onOpenChange: (open: boolean) => void;
};

export function CsvImportDialog({ text, onOpenChange }: Props) {
  const open = text !== null;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      size="md"
      role="dialog"
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            {text !== null && (
              <CsvImportDialogBody text={text} onClose={() => onOpenChange(false)} />
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

type Phase =
  | { kind: 'parsing' }
  | { kind: 'preview'; preview: ImportPreview }
  | { kind: 'applying' }
  | { kind: 'error'; message: string };

function CsvImportDialogBody({ text, onClose }: { text: string; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'parsing' });
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    previewImportCsv(text)
      .then((preview) => {
        if (!cancelled) setPhase({ kind: 'preview', preview });
      })
      .catch(() => {
        if (!cancelled) setPhase({ kind: 'error', message: 'CSV를 읽지 못했습니다.' });
      });
    return () => {
      cancelled = true;
    };
  }, [text]);

  function handleApply() {
    if (phase.kind !== 'preview') return;
    const rows = phase.preview.rowsToInsert;
    startTransition(async () => {
      try {
        const { inserted } = await applyImportCsv(rows);
        toaster.create({
          description: `${inserted}개 작업을 추가했습니다.`,
          type: 'success',
          closable: true,
        });
        onClose();
      } catch {
        toaster.create({
          description: '가져오기에 실패했습니다.',
          type: 'error',
          closable: true,
        });
      }
    });
  }

  return (
    <>
      <Dialog.Header>
        <Dialog.Title>CSV 불러오기</Dialog.Title>
      </Dialog.Header>
      <Dialog.Body>
        {phase.kind === 'parsing' && (
          <HStack>
            <Spinner size="sm" />
            <Text>분석 중…</Text>
          </HStack>
        )}
        {phase.kind === 'error' && (
          <Text color="red.600" data-testid="csv-import-error">
            {phase.message}
          </Text>
        )}
        {phase.kind === 'preview' && <PreviewView preview={phase.preview} />}
      </Dialog.Body>
      <Dialog.Footer>
        <HStack gap="2" justify="flex-end">
          <Dialog.ActionTrigger asChild>
            <Button variant="ghost" disabled={pending}>
              취소
            </Button>
          </Dialog.ActionTrigger>
          <Button
            colorPalette="blue"
            onClick={handleApply}
            disabled={
              phase.kind !== 'preview' || phase.preview.rowsToInsert.length === 0 || pending
            }
            loading={pending}
          >
            적용
          </Button>
        </HStack>
      </Dialog.Footer>
      <Dialog.CloseTrigger asChild>
        <CloseButton size="sm" />
      </Dialog.CloseTrigger>
    </>
  );
}

function PreviewView({ preview }: { preview: ImportPreview }) {
  const { rowsToInsert, rejected, warnings } = preview;
  return (
    <VStack align="stretch" gap="3">
      <Text data-testid="csv-import-summary">
        {`${rowsToInsert.length}개 작업을 추가합니다. 제외 ${rejected.length}건`}
      </Text>

      {rejected.length > 0 && (
        <Box>
          <Heading size="sm" mb="1">
            제외된 행
          </Heading>
          <List.Root data-testid="csv-import-rejected">
            {rejected.map((r, i) => (
              <List.Item key={i}>{`${r.row}행: ${r.reason}`}</List.Item>
            ))}
          </List.Root>
        </Box>
      )}

      {warnings.length > 0 && (
        <Box>
          <Heading size="sm" mb="1">
            경고
          </Heading>
          <List.Root data-testid="csv-import-warnings">
            {warnings.map((w, i) => (
              <List.Item key={i}>{`${w.row}행: ${w.message}`}</List.Item>
            ))}
          </List.Root>
        </Box>
      )}
    </VStack>
  );
}
