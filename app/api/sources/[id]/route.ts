import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { errorResponse } from '@/lib/api-errors';
import { deleteSource } from '@/lib/sources/sources-store';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  try {
    const result = await deleteSource(id);
    if (result === 'not_found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
