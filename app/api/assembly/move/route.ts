import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fanOutNotifications } from '@/lib/notifications';
import { ObjectId, type Document } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { ASSEMBLY_STAGES, type AssemblyStage } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface MoveBody {
  rowIndexes: number[];
  targetStage: AssemblyStage;
  batchStrategy:
    | { type: 'new'; name?: string }
    | { type: 'existing'; batchId: string };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MoveBody;
    const { rowIndexes, targetStage, batchStrategy } = body;

    if (!Array.isArray(rowIndexes) || rowIndexes.length === 0) {
      return NextResponse.json({ error: 'rowIndexes must be a non-empty array' }, { status: 400 });
    }
    if (!ASSEMBLY_STAGES.includes(targetStage)) {
      return NextResponse.json({ error: 'Invalid targetStage' }, { status: 400 });
    }

    const db = await getDb();
    const col = db.collection('assembly_batches');

    // 1. Remove rowIndexes from any current batch
    await col.updateMany(
      { productRowIndexes: { $in: rowIndexes } },
      { $pull: { productRowIndexes: { $in: rowIndexes } } as Document },
    );

    // 2. Delete empty batches
    await col.deleteMany({ productRowIndexes: { $size: 0 } });

    // 3. Resolve target batch
    let targetBatchId: ObjectId = new ObjectId();

    if (batchStrategy.type === 'existing') {
      targetBatchId = new ObjectId(batchStrategy.batchId);
      await col.updateOne(
        { _id: targetBatchId },
        { $addToSet: { productRowIndexes: { $each: rowIndexes } } as Document },
      );
    } else {
      const batchName = batchStrategy.name ?? todayIso();
      const existing = await col.findOne({ stage: targetStage, name: batchName });

      // Reuse an existing batch with the same stage+name so partial moves and
      // whole-batch moves continue to consolidate into one visible batch.
      if (existing) {
        await col.updateOne(
          { _id: existing._id },
          { $addToSet: { productRowIndexes: { $each: rowIndexes } } as Document },
        );
        targetBatchId = existing._id;
      } else {
        const res = await col.insertOne({
          name: batchName,
          stage: targetStage,
          productRowIndexes: rowIndexes,
          createdAt: new Date(),
        });
        targetBatchId = res.insertedId;
      }
    }

    // 4. Sync sheet if target is "Ready for Upload"
    if (targetStage === 'Ready for Upload') {
      const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
      const sheetRes = await fetch(`${baseUrl}/api/products/bulk`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndexes, field: 'readyForUpload', value: 'TRUE' }),
      });
      if (!sheetRes.ok) {
        console.warn('[assembly/move] Sheet sync failed for "Ready for Upload":', await sheetRes.text());
      }
    }

    // actorEmail comes from NextAuth session — always lowercase from Google OAuth
    const session = await getServerSession(authOptions);
    const actorEmail = session?.user?.email ?? '';

    // Fan out notifications (fire-and-forget — failure must not block the move)
    try {
      const movedBatch = await col.findOne({ _id: targetBatchId });
      await fanOutNotifications({
        batchId: targetBatchId.toString(),
        batchName: movedBatch?.name ?? '',
        productCount: rowIndexes.length,
        targetStage,
        actorEmail,
      });
    } catch (notifErr) {
      console.warn('[assembly/move] Notification fan-out failed:', notifErr);
    }

    return NextResponse.json({ ok: true, batchId: targetBatchId.toString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
