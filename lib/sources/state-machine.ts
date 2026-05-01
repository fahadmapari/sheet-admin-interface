// lib/sources/state-machine.ts
//
// Opportunistic state advancement. Called from the GET poll endpoint.
// Each invocation tries to advance the job by one step. Concurrent calls are
// safe: tryClaimProcessingLock ensures only one caller does the work.
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

  const claimed = await tryClaimProcessingLock(id, PROCESSING_LOCK_TTL_MS);
  if (!claimed) return;

  try {
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
  await updateCrawlJob(id, { status: 'failed', error: message });
  await releaseGlobalCrawlLock(id);
}
