import { EmptyState, VStack } from '@chakra-ui/react';

export function TaskListEmpty() {
  return (
    <EmptyState.Root>
      <EmptyState.Content>
        <VStack textAlign="center">
          <EmptyState.Title>아직 작업이 없습니다</EmptyState.Title>
          <EmptyState.Description>첫 작업을 추가해 시작하세요</EmptyState.Description>
        </VStack>
      </EmptyState.Content>
    </EmptyState.Root>
  );
}
