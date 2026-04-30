import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { getDb } from '@/lib/mongodb';
import { errorResponse } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { batchId } = await params;
  if (!ObjectId.isValid(batchId)) {
    return NextResponse.json({ error: 'Invalid batchId' }, { status: 400 });
  }

  try {
    const db = await getDb();
    await db.collection('assembly_batches').deleteOne({ _id: new ObjectId(batchId) });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
