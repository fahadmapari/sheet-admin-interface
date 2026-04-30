import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateSheetLink, deleteSheetLink } from '@/lib/sheet-links';
import { errorResponse } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json()) as {
    name?: string;
    url?: string;
    tags?: string[];
    visibleToTeam?: boolean;
  };

  try {
    const result = await updateSheetLink(id, session.user.email, body);
    if (result === 'not_found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (result === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await deleteSheetLink(id, session.user.email);
    if (result === 'not_found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (result === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
