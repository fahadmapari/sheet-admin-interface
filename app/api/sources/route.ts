import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/api-errors';
import { listSources } from '@/lib/sources/sources-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;
  try {
    const sources = await listSources({
      country: sp.get('country') ?? undefined,
      city: sp.get('city') ?? undefined,
      provider: sp.get('provider') ?? undefined,
      q: sp.get('q') ?? undefined,
    });
    return NextResponse.json({ sources });
  } catch (err) {
    return errorResponse(err);
  }
}
