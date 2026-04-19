import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { getDb } from '@/lib/mongodb';
import { ASSEMBLY_STAGES, type AssemblyStage, type StageConfig } from '@/lib/types';

export const dynamic = 'force-dynamic';

const COLLECTION = 'stageconfig';
const SINGLETON_ID = 'singleton';

async function getStageConfig(): Promise<StageConfig> {
  const db = await getDb();
  const doc = await (db.collection(COLLECTION) as any).findOne({ _id: SINGLETON_ID });
  if (!doc) return { owners: {} };
  return { owners: (doc.owners ?? {}) as StageConfig['owners'] };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const config = await getStageConfig();
    return NextResponse.json(config);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(session.user.email))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await req.json()) as { stage: AssemblyStage; emails: string[] };
    if (!ASSEMBLY_STAGES.includes(body.stage) || !Array.isArray(body.emails)) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const db = await getDb();
    await (db.collection(COLLECTION) as any).updateOne(
      { _id: SINGLETON_ID },
      { $set: { [`owners.${body.stage}`]: body.emails } },
      { upsert: true },
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
