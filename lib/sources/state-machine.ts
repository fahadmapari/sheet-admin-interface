// lib/sources/state-machine.ts
//
// Opportunistic state advancement. Called from the GET poll endpoint.
// Each invocation tries to advance the job by one step. Concurrent calls are
// safe: tryClaimProcessingLock ensures only one caller does the work.
//
// Global crawl lock invariant:
//   - The global crawl lock is ACQUIRED by the POST /api/sources/scrape route
//     (Task 11) before a new crawl job is started — not here.
//   - This module only RELEASES the global lock, and only on terminal
//     transitions (success: ready_for_review, or failure: failed).
//   - The `mapping` stage does not hold the global lock; the lock is acquired
//     just before the scraping stage begins in the scrape route.
import 'server-only';
import {
  getCrawlJob,
  updateCrawlJob,
  tryClaimProcessingLock,
  releaseProcessingLock,
} from './crawl-jobs';
import { releaseGlobalCrawlLock } from './crawl-lock';
import { mapSite, pollCrawl } from './firecrawl';
import { classifyPages } from './gemini';
import { PROCESSING_LOCK_TTL_MS } from './constants';

export async function advanceCrawlJob(id: string): Promise<void> {
  const initial = await getCrawlJob(id);
  if (!initial) return;
  if (
    initial.status === 'awaiting_url_selection' ||
    initial.status === 'ready_for_review' ||
    initial.status === 'failed' ||
    initial.status === 'archived'
  ) {
    return;
  }

  const claimed = await tryClaimProcessingLock(id, PROCESSING_LOCK_TTL_MS);
  if (!claimed) return;

  try {
    // Re-fetch after claiming the lock — status may have changed between the
    // initial read and the lock claim (e.g. a concurrent archive request).
    const job = await getCrawlJob(id);
    if (!job) return;
    if (
      job.status === 'awaiting_url_selection' ||
      job.status === 'ready_for_review' ||
      job.status === 'failed' ||
      job.status === 'archived'
    ) {
      return;
    }

    if (job.status === 'mapping') {
      const result = await mapSite(job.rootUrl);
      await updateCrawlJob(id, {
        mapResult: result,
        status: 'awaiting_url_selection',
      });
      return;
    }

    if (job.status === 'scraping') {
      if (!job.firecrawlCrawlJobId) {
        await markFailed(id, 'Missing Firecrawl crawl job ID');
        return;
      }
      const poll = await pollCrawl(job.firecrawlCrawlJobId);
      if (poll.status === 'failed') {
        await markFailed(id, poll.error ?? 'Firecrawl crawl failed');
        return;
      }
      if (poll.status === 'in_progress') return; // remain in scraping
      // completed
      await updateCrawlJob(id, {
        scrapeResult: poll.pages,
        status: 'classifying',
      });
      return;
    }

    if (job.status === 'classifying') {
      if (!job.scrapeResult) {
        await markFailed(id, 'Missing scrape result for classification');
        return;
      }
      // Classify any pages not already in classifications.
      const alreadyDone = new Set((job.classifications ?? []).map((c) => c.url));
      const toClassify = job.scrapeResult.filter((p) => !alreadyDone.has(p.url));
      if (toClassify.length === 0) {
        await updateCrawlJob(id, { status: 'ready_for_review' });
        await releaseGlobalCrawlLock(id);
        return;
      }
      const newResults = await classifyPages({
        pages: toClassify,
        defaultCity: job.defaultCity,
        defaultCountry: job.defaultCountry,
        providerName: job.providerName,
      });
      const merged = [...(job.classifications ?? []), ...newResults];
      await updateCrawlJob(id, {
        classifications: merged,
        status: 'ready_for_review',
        costEstimate: {
          pagesScraped: job.scrapeResult.length,
          geminiTokens: 0, // SDK doesn't always return usage; left at 0 unless we wire it up later
        },
      });
      await releaseGlobalCrawlLock(id);
      return;
    }
  } catch (err) {
    console.error('[sources] advanceCrawlJob failed', err);
    await markFailed(id, err instanceof Error ? err.message : 'Unknown error');
  } finally {
    await releaseProcessingLock(id);
  }
}

async function markFailed(id: string, message: string): Promise<void> {
  try {
    await updateCrawlJob(id, { status: 'failed', error: message });
  } catch (e) {
    console.error('[sources] failed to mark job failed', e);
  }
  try {
    await releaseGlobalCrawlLock(id);
  } catch (e) {
    console.error('[sources] failed to release global crawl lock', e);
  }
}
