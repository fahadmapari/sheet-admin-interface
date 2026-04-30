import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ARCHIVE_THRESHOLD_MS } from '@/lib/constants';
import type { AssemblyBatch } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const db = await getDb();
    const cutoff = new Date(Date.now() - ARCHIVE_THRESHOLD_MS);

    const allUploaded = await db
      .collection('assembly_batches')
      .aggregate([
        { $match: { stage: 'Uploaded' } },
        { $addFields: { _ageRef: { $ifNull: ['$uploadedAt', '$createdAt'] } } },
        { $sort: { _ageRef: -1 } },
      ])
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
    return errorResponse(err);
  }
}
