import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { type AppNotification, type AssemblyStage } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const raw = await db
      .collection('notifications')
      .find({ recipientEmail: session.user.email })
      .sort({ read: 1, createdAt: -1 })
      .limit(50)
      .toArray();

    const notifications: AppNotification[] = raw.map((n) => ({
      _id: n._id.toString(),
      recipientEmail: n.recipientEmail as string,
      batchId: n.batchId as string,
      batchName: n.batchName as string,
      productCount: n.productCount as number,
      stage: n.stage as AssemblyStage,
      createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : (n.createdAt as string),
      read: n.read as boolean,
    }));

    return NextResponse.json({ notifications });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
