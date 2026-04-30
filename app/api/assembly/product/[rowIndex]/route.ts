import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { type Document } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { parseRowIndexParam } from '@/lib/validation';
import { errorResponse } from '@/lib/api-errors';
import type { AssemblyStage } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ rowIndex: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { rowIndex: rowIndexStr } = await params;
  const rowIndex = parseRowIndexParam(rowIndexStr);
  if (rowIndex === null) {
    return NextResponse.json({ error: 'Invalid rowIndex' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const batch = await db
      .collection('assembly_batches')
      .findOne({ productRowIndexes: rowIndex });

    if (!batch) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      stage: batch.stage as AssemblyStage,
      batchId: batch._id.toString(),
      batchName: batch.name as string,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ rowIndex: string }> },
) {
  const session = await auth();
  if (!session?.user?.email || !(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { rowIndex: rowIndexStr } = await params;
  const rowIndex = parseRowIndexParam(rowIndexStr);
  if (rowIndex === null) {
    return NextResponse.json({ error: 'Invalid rowIndex' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const col = db.collection('assembly_batches');
    await col.updateOne(
      { productRowIndexes: rowIndex },
      { $pull: { productRowIndexes: rowIndex } } as Document,
    );
    // Clean up empty batches
    await col.deleteMany({ productRowIndexes: { $size: 0 } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
