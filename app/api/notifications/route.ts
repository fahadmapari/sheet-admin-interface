import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { type AppNotification, type AssemblyStage } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
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
    return errorResponse(err);
  }
}
