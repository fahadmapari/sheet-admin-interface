import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createShareableLink,
  listShareableLinksMine,
  listShareableLinksTeam,
} from '@/lib/shareables';
import type { Filters } from '@/lib/product-filters';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as {
    title: string;
    expiresAt: string | null;
    visibleToTeam: boolean;
    columns: string[];
    filters: Filters;
  };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }
  if (!Array.isArray(body.columns) || body.columns.length === 0) {
    return NextResponse.json({ error: 'At least one column is required' }, { status: 400 });
  }

  try {
    const token = await createShareableLink({
      title: body.title.trim(),
      expiresAt: body.expiresAt ?? null,
      visibleToTeam: body.visibleToTeam ?? false,
      columns: body.columns,
      filters: body.filters,
      createdBy: session.user.email,
    });
    return NextResponse.json({ token });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scope = req.nextUrl.searchParams.get('scope') ?? 'mine';
  const email = session.user.email;

  try {
    const links = scope === 'team'
      ? await listShareableLinksTeam(email)
      : await listShareableLinksMine(email);
    return NextResponse.json(links);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
