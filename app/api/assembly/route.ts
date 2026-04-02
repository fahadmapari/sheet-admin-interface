import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ASSEMBLY_STAGES, type AssemblyResponse, type AssemblyStage } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();
    const batches = await db
      .collection('assembly_batches')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const result = Object.fromEntries(
      ASSEMBLY_STAGES.map((stage) => [
        stage,
        {
          batches: batches
            .filter((b) => b.stage === stage)
            .map((b) => ({
              _id: b._id.toString(),
              name: b.name as string,
              stage: b.stage as AssemblyStage,
              productRowIndexes: b.productRowIndexes as number[],
              createdAt: (b.createdAt as Date).toISOString(),
            })),
        },
      ]),
    ) as AssemblyResponse;

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
