import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ASSEMBLY_STAGES, type AssemblyStage } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const sub = await db
      .collection('notification_subscriptions')
      .findOne({ email: session.user.email });

    return NextResponse.json({ stages: (sub?.stages ?? []) as AssemblyStage[] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as { stages: AssemblyStage[] };

    if (
      !Array.isArray(body.stages) ||
      body.stages.some((s) => !ASSEMBLY_STAGES.includes(s))
    ) {
      return NextResponse.json({ error: 'Invalid stages' }, { status: 400 });
    }

    const db = await getDb();
    await db.collection('notification_subscriptions').updateOne(
      { email: session.user.email },
      { $set: { email: session.user.email, stages: body.stages } },
      { upsert: true },
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
