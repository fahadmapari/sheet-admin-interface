import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import { auth } from '@/lib/auth';
import { createSheetLink, listSheetLinksMine, listSheetLinksTeam } from '@/lib/sheet-links';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scope = req.nextUrl.searchParams.get('scope') ?? 'mine';
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const email = session.user.email;

  try {
    const links =
      scope === 'team'
        ? await listSheetLinksTeam(email, q)
        : await listSheetLinksMine(email, q);
    return NextResponse.json(links);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as {
    name: string;
    url: string;
    tags: string[];
    visibleToTeam: boolean;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!body.url?.trim()) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const link = await createSheetLink({
      name: body.name.trim(),
      url: body.url.trim(),
      tags: Array.isArray(body.tags) ? body.tags : [],
      visibleToTeam: body.visibleToTeam ?? false,
      createdBy: session.user.email,
    });
    return NextResponse.json(link, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
