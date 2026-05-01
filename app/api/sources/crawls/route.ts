import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { errorResponse } from '@/lib/api-errors';
import { createCrawlJob, listCrawlJobs } from '@/lib/sources/crawl-jobs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const includeArchived = req.nextUrl.searchParams.get('archived') === 'true';
  try {
    const jobs = await listCrawlJobs({ includeArchived });
    return NextResponse.json({ jobs });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await req.json()) as {
    rootUrl?: string;
    providerName?: string;
    defaultCountry?: string;
    defaultCity?: string;
  };

  const rootUrl = body.rootUrl?.trim();
  const providerName = body.providerName?.trim();
  const defaultCountry = body.defaultCountry?.trim();
  const defaultCity = body.defaultCity?.trim();

  if (!rootUrl) return NextResponse.json({ error: 'rootUrl is required' }, { status: 400 });
  if (!providerName) return NextResponse.json({ error: 'providerName is required' }, { status: 400 });
  if (!defaultCountry) return NextResponse.json({ error: 'defaultCountry is required' }, { status: 400 });
  if (!defaultCity) return NextResponse.json({ error: 'defaultCity is required' }, { status: 400 });

  try {
    new URL(rootUrl); // throws on invalid
  } catch {
    return NextResponse.json({ error: 'rootUrl must be a valid URL' }, { status: 400 });
  }

  try {
    const job = await createCrawlJob({
      rootUrl,
      providerName,
      defaultCountry,
      defaultCity,
      submittedBy: session.user.email,
    });
    return NextResponse.json({ id: job._id, status: job.status }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
