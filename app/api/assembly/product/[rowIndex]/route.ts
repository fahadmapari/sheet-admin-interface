import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import type { AssemblyStage } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { rowIndex: string } },
) {
  const rowIndex = parseInt(params.rowIndex, 10);
  if (Number.isNaN(rowIndex)) {
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
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
