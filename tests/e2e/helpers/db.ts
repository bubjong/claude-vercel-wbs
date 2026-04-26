import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';

export async function truncateTasks() {
  await db.delete(tasks);
}
