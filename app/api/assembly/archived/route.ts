import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ARCHIVE_THRESHOLD_MS } from '@/lib/constants';
import type { AssemblyBatch } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();
    const cutoff = new Date(Date.now() - ARCHIVE_THRESHOLD_MS);

    const allUploaded = await db
      .collection('assembly_batches')
      .find({ stage: 'Uploaded' })
      .sort({ createdAt: -1 })
      .toArray();

    const batches: AssemblyBatch[] = allUploaded
      .filter((b) => {
        const ageRef = b.uploadedAt ?? b.createdAt;
        return new Date(ageRef) < cutoff;
      })
      .map((b) => ({
        _id: b._id.toString(),
        name: b.name as string,
        stage: 'Uploaded',
        productRowIndexes: b.productRowIndexes as number[],
        createdAt: (b.createdAt as Date).toISOString(),
        ...(b.uploadedAt && { uploadedAt: (b.uploadedAt as Date).toISOString() }),
      }));

    return NextResponse.json({ batches });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
