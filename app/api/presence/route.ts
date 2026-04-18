import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { type PresenceUser } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as { page: string };
    const { page } = body;

    const db = await getDb();
    const presenceCol = db.collection('presence');
    await presenceCol.createIndex({ lastSeen: 1 }, { expireAfterSeconds: 15 });
    await presenceCol.createIndex({ page: 1 });

    await presenceCol.updateOne(
      { email: session.user.email },
      {
        $set: {
          email: session.user.email,
          name: session.user.name ?? '',
          image: session.user.image ?? null,
          page,
          lastSeen: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queriedPage = searchParams.get('page');

    if (!queriedPage) {
      return NextResponse.json({ error: 'Missing page parameter' }, { status: 400 });
    }

    const db = await getDb();
    const presenceCol = db.collection('presence');
    await presenceCol.createIndex({ lastSeen: 1 }, { expireAfterSeconds: 15 });
    await presenceCol.createIndex({ page: 1 });

    const fifteenSecondsAgo = new Date(Date.now() - 15 * 1000);

    const raw = await presenceCol
      .find({
        page: queriedPage,
        lastSeen: { $gte: fifteenSecondsAgo },
        email: { $ne: session.user.email },
      })
      .toArray();

    const users: PresenceUser[] = raw.map((doc) => ({
      email: doc.email as string,
      name: doc.name as string,
      image: (doc.image ?? null) as string | null,
    }));

    return NextResponse.json({ users });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
