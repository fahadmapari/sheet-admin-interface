import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { getColumnGroups, saveColumnGroups, resetColumnGroups, type ColumnGroup } from '@/lib/column-groups';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const data = await getColumnGroups();
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(session.user.email))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json() as { groups: ColumnGroup[] };

    const isValidGroup = (g: unknown): g is ColumnGroup =>
      typeof g === 'object' && g !== null &&
      typeof (g as any).id === 'string' && (g as any).id.length > 0 &&
      typeof (g as any).label === 'string' && (g as any).label.length > 0 &&
      Array.isArray((g as any).fields) &&
      (g as any).fields.every((f: unknown) => typeof f === 'string' && f.length > 0);

    if (!Array.isArray(body?.groups) || !body.groups.every(isValidGroup)) {
      return NextResponse.json({ error: 'Invalid body: expected { groups: [...] }' }, { status: 400 });
    }

    await saveColumnGroups(body.groups);
    const data = await getColumnGroups();
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(session.user.email))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await resetColumnGroups();
    const data = await getColumnGroups();
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err);
  }
}
