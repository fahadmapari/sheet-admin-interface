import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { errorResponse } from '@/lib/api-errors';
import { getCrawlJob, updateCrawlJob } from '@/lib/sources/crawl-jobs';
import { tryAcquireGlobalCrawlLock, releaseGlobalCrawlLock } from '@/lib/sources/crawl-lock';
import { startCrawl } from '@/lib/sources/firecrawl';
import { MAX_PAGES_PER_CRAWL } from '@/lib/sources/constants';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
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
  const body = (await req.json()) as { selectedUrls?: string[] };
  const urls = Array.isArray(body.selectedUrls) ? body.selectedUrls : [];

  if (urls.length === 0) {
    return NextResponse.json({ error: 'selectedUrls is required and non-empty' }, { status: 400 });
  }
  if (urls.length > MAX_PAGES_PER_CRAWL) {
    return NextResponse.json(
      { error: `Cannot scrape more than ${MAX_PAGES_PER_CRAWL} URLs` },
      { status: 400 },
    );
  }

  try {
    const job = await getCrawlJob(id);
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (job.status !== 'awaiting_url_selection') {
      return NextResponse.json(
        { error: `Cannot start scrape from status ${job.status}` },
        { status: 409 },
      );
    }

    const lock = await tryAcquireGlobalCrawlLock(id);
    if (!lock.ok) {
      return NextResponse.json(
        { error: 'Another crawl is in progress', heldBy: lock.heldBy },
        { status: 409 },
      );
    }

    let firecrawlJobId: string;
    try {
      firecrawlJobId = await startCrawl(urls);
    } catch (err) {
      await releaseGlobalCrawlLock(id);
      throw err;
    }

    await updateCrawlJob(id, {
      selectedUrls: urls,
      firecrawlCrawlJobId: firecrawlJobId,
      status: 'scraping',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
