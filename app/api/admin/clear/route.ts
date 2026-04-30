import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

const ALLOWED_TARGETS = {
  assembly: 'assembly_batches',
  notifications: 'notifications',
} as const;

type ClearTarget = keyof typeof ALLOWED_TARGETS;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let target: ClearTarget;
  try {
    const body = await req.json() as { target?: unknown };
    const t = body.target;
    if (typeof t !== 'string' || !(t in ALLOWED_TARGETS)) {
      return NextResponse.json({ error: 'Invalid target' }, { status: 400 });
    }
    target = t as ClearTarget;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const collectionName = ALLOWED_TARGETS[target];
    const result = await db.collection(collectionName).deleteMany({});
    return NextResponse.json({ ok: true, deletedCount: result.deletedCount });
  } catch (err) {
    return errorResponse(err);
  }
}
