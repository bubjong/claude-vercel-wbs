'use client';

import { useReducer, useState } from 'react';
import {
  Button,
  CloseButton,
  Dialog,
  Field,
  Input,
  Portal,
  Select,
  Stack,
  Textarea,
  createListCollection,
} from '@chakra-ui/react';
import { createTask, type TaskStatus } from '@/lib/actions/tasks';
import { toaster } from '@/components/ui/toaster';

type FormState = {
  title: string;
  description: string;
  assignee: string;
  status: TaskStatus;
  progress: number;
  startDate: string;
  dueDate: string;
};

const INITIAL_STATE: FormState = {
  title: '',
  description: '',
  assignee: '',
  status: 'todo',
  progress: 0,
  startDate: '',
  dueDate: '',
};

type Action =
  | {
      type: 'set-text';
      field: 'title' | 'description' | 'assignee' | 'startDate' | 'dueDate';
      value: string;
    }
  | { type: 'set-status'; value: TaskStatus }
  | { type: 'set-progress'; value: number }
  | { type: 'reset' };

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case 'set-text':
      return { ...state, [action.field]: action.value };
    case 'set-status':
      return { ...state, status: action.value };
    case 'set-progress':
      return { ...state, progress: action.value };
    case 'reset':
      return INITIAL_STATE;
  }
}

const statusCollection = createListCollection<{ label: string; value: TaskStatus }>({
  items: [
    { label: '할 일', value: 'todo' },
    { label: '진행 중', value: 'doing' },
    { label: '완료', value: 'done' },
  ],
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId?: string;
  parentTitle?: string;
};

export function TaskCreateModal({ open, onOpenChange, parentId, parentTitle }: Props) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);

  const titleError = state.title.trim() === '';
  const dateError =
    state.startDate && state.dueDate && state.dueDate < state.startDate
      ? '목표 기한은 시작일 이후여야 합니다.'
      : '';
  const progressError =
    Number.isNaN(state.progress) || state.progress < 0 || state.progress > 100
      ? '진행률은 0과 100 사이여야 합니다.'
      : '';

  const canSubmit = !titleError && !dateError && !progressError && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    const result = await createTask({
      title: state.title,
      description: state.description || undefined,
      assignee: state.assignee || undefined,
      status: state.status,
      progress: state.progress,
      startDate: state.startDate || undefined,
      dueDate: state.dueDate || undefined,
      parentId,
    });
    setSubmitting(false);

    if (!result.ok) {
      toaster.create({
        description: result.error,
        type: 'error',
        closable: true,
      });
      return;
    }

    onOpenChange(false);
    dispatch({ type: 'reset' });
  }

  function handleOpenChange(e: { open: boolean }) {
    onOpenChange(e.open);
    if (!e.open) dispatch({ type: 'reset' });
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange} size="md">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                {parentTitle ? `"${parentTitle}"의 하위 작업 추가` : '새 작업 추가'}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap="4">
                <Field.Root invalid={titleError} required>
                  <Field.Label>
                    제목 <Field.RequiredIndicator />
                  </Field.Label>
                  <Input
                    value={state.title}
                    onChange={(e) =>
                      dispatch({ type: 'set-text', field: 'title', value: e.target.value })
                    }
                    placeholder="예: 기획 회의"
                  />
                  {titleError && <Field.ErrorText>제목은 필수입니다.</Field.ErrorText>}
                </Field.Root>

                <Field.Root>
                  <Field.Label>설명</Field.Label>
                  <Textarea
                    value={state.description}
                    onChange={(e) =>
                      dispatch({ type: 'set-text', field: 'description', value: e.target.value })
                    }
                    rows={3}
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>담당자</Field.Label>
                  <Input
                    value={state.assignee}
                    onChange={(e) =>
                      dispatch({ type: 'set-text', field: 'assignee', value: e.target.value })
                    }
                    placeholder="예: 김PM"
                  />
                </Field.Root>

                <Field.Root>
                  <Field.Label>상태</Field.Label>
                  <Select.Root
                    collection={statusCollection}
                    value={[state.status]}
                    onValueChange={(e) =>
                      dispatch({ type: 'set-status', value: e.value[0] as TaskStatus })
                    }
                  >
                    <Select.HiddenSelect />
                    <Select.Control>
                      <Select.Trigger>
                        <Select.ValueText />
                      </Select.Trigger>
                      <Select.IndicatorGroup>
                        <Select.Indicator />
                      </Select.IndicatorGroup>
                    </Select.Control>
                    <Portal>
                      <Select.Positioner>
                        <Select.Content>
                          {statusCollection.items.map((item) => (
                            <Select.Item item={item} key={item.value}>
                              {item.label}
                              <Select.ItemIndicator />
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Positioner>
                    </Portal>
                  </Select.Root>
                </Field.Root>

                <Field.Root invalid={!!progressError}>
                  <Field.Label>진행률 (0–100)</Field.Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={state.progress}
                    onChange={(e) =>
                      dispatch({ type: 'set-progress', value: Number(e.target.value) })
                    }
                  />
                  {progressError ? (
                    <Field.ErrorText>{progressError}</Field.ErrorText>
                  ) : (
                    <Field.HelperText>
                      100을 입력하면 상태가 자동으로 &apos;완료&apos;가 됩니다.
                    </Field.HelperText>
                  )}
                </Field.Root>

                <Field.Root>
                  <Field.Label>시작일</Field.Label>
                  <Input
                    type="date"
                    value={state.startDate}
                    onChange={(e) =>
                      dispatch({ type: 'set-text', field: 'startDate', value: e.target.value })
                    }
                  />
                </Field.Root>

                <Field.Root invalid={!!dateError}>
                  <Field.Label>목표 기한</Field.Label>
                  <Input
                    type="date"
                    value={state.dueDate}
                    onChange={(e) =>
                      dispatch({ type: 'set-text', field: 'dueDate', value: e.target.value })
                    }
                  />
                  {dateError && <Field.ErrorText>{dateError}</Field.ErrorText>}
                </Field.Root>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">취소</Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="blue" disabled={!canSubmit} onClick={handleSubmit}>
                {submitting ? '저장 중...' : '저장'}
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
