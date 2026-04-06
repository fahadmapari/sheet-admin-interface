import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

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

    const notifications = raw.map((n) => ({
      ...n,
      _id: n._id.toString(),
      createdAt:
        n.createdAt instanceof Date ? n.createdAt.toISOString() : (n.createdAt as string),
    }));

    return NextResponse.json({ notifications });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
