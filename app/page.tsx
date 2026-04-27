import { Container, Heading, VStack } from '@chakra-ui/react';
import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { flattenTaskTree } from '@/lib/tasks/tree';
import { TaskViewContainer } from '@/components/tasks/task-view-container';

// 매 요청 시 DB에서 최신 작업 목록을 가져와야 하므로 정적 프리렌더 금지.
export const dynamic = 'force-dynamic';

export default async function Page() {
  const rows = await db.select().from(tasks).orderBy(asc(tasks.createdAt));
  const nodes = flattenTaskTree(rows);

  return (
    <Container maxW="6xl" py="6">
      <VStack gap="6" align="stretch">
        <Heading size="lg">WBS</Heading>
        <TaskViewContainer nodes={nodes} />
      </VStack>
    </Container>
  );
}
