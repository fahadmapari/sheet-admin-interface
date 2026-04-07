import 'server-only';
import { getDb } from '@/lib/mongodb';
import type { AssemblyStage } from '@/lib/types';

export async function fanOutNotifications({
  batchId,
  batchName,
  productCount,
  targetStage,
}: {
  batchId: string;
  batchName: string;
  productCount: number;
  targetStage: AssemblyStage;
}): Promise<void> {
  const db = await getDb();

  const subscribers = await db
    .collection('notification_subscriptions')
    .find({ stages: targetStage })
    .toArray();

  if (subscribers.length === 0) return;

  const docs = subscribers.map((sub) => ({
    recipientEmail: sub.email as string,
    batchId,
    batchName,
    productCount,
    stage: targetStage,
    createdAt: new Date(),
    read: false,
  }));

  await db.collection('notifications').insertMany(docs);
}
