import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { errorResponse } from '@/lib/api-errors';
import { getCrawlJob, updateCrawlJob } from '@/lib/sources/crawl-jobs';
import { tryAcquireGlobalCrawlLock, releaseGlobalCrawlLock } from '@/lib/sources/crawl-lock';
import type { CrawlJobStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Retry rules:
//  - If we have classifications missing some pages → re-enter 'classifying'
//  - Else if scrapeResult exists → re-enter 'classifying' from scratch
//  - Else if firecrawlCrawlJobId exists → re-enter 'scraping' (poll same job)
//  - Else if mapResult exists → re-enter 'awaiting_url_selection'
//  - Else → re-enter 'mapping'
function nextStatusForRetry(job: {
  mapResult: unknown;
  selectedUrls: unknown;
  firecrawlCrawlJobId: unknown;
  scrapeResult: unknown;
}): CrawlJobStatus {
  if (job.scrapeResult) return 'classifying';
  if (job.firecrawlCrawlJobId) return 'scraping';
  if (job.mapResult) return 'awaiting_url_selection';
  return 'mapping';
}

export async function POST(
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
    const job = await getCrawlJob(id);
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (job.status !== 'failed') {
      return NextResponse.json({ error: 'Only failed jobs can be retried' }, { status: 409 });
    }
    const next = nextStatusForRetry(job);

    // scraping and classifying both require the global crawl lock — markFailed
    // released it on the original failure, so we must re-acquire here.
    const needsLock = next === 'scraping' || next === 'classifying';
    if (needsLock) {
      const lock = await tryAcquireGlobalCrawlLock(id);
      if (!lock.ok) {
        return NextResponse.json(
          { error: 'Another crawl is in progress', heldBy: lock.heldBy },
          { status: 409 },
        );
      }
    }

    try {
      await updateCrawlJob(id, { status: next, error: null });
    } catch (err) {
      // If we acquired the lock and the status update failed, release it.
      if (needsLock) await releaseGlobalCrawlLock(id);
      throw err;
    }

    return NextResponse.json({ success: true, status: next });
  } catch (err) {
    return errorResponse(err);
  }
}
