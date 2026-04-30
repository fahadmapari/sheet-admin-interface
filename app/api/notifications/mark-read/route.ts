import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const result = await db
      .collection('notifications')
      .updateMany(
        { recipientEmail: session.user.email, read: false },
        { $set: { read: true } },
      );

    return NextResponse.json({ ok: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    return errorResponse(err);
  }
}
