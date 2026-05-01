// lib/sources/firecrawl.ts
import 'server-only';
// SDK v4 renamed the default export to `Firecrawl` (v2 client); the v1 client
// (which exposes mapUrl / asyncBatchScrapeUrls / checkBatchScrapeStatus) is
// exported as `FirecrawlAppV1`. We alias it to FirecrawlApp for clarity.
import { FirecrawlAppV1 as FirecrawlApp } from '@mendable/firecrawl-js';
import { MARKDOWN_EXCERPT_CHARS } from './constants';
import type { ScrapedPage } from '@/lib/types';

function getClient(): FirecrawlApp {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error('Missing FIRECRAWL_API_KEY environment variable');
  return new FirecrawlApp({ apiKey });
}

// Returns the URL list discovered by Firecrawl /map. Synchronous from our
// perspective — Firecrawl /map is fast (seconds for typical sites).
export async function mapSite(rootUrl: string): Promise<{ urls: string[]; totalCount: number }> {
  const client = getClient();
  const res = await client.mapUrl(rootUrl, { limit: 5000 });
  if (!res.success) throw new Error(`Firecrawl /map failed: ${(res as { error?: string }).error ?? 'unknown'}`);
  // res.links is string[] | undefined on v1 MapResponse
  const urls = (res.links ?? []).filter((u: unknown): u is string => typeof u === 'string');
  return { urls, totalCount: urls.length };
}

// Submit a /crawl job. Returns the Firecrawl job ID for later polling.
export async function startCrawl(urls: string[]): Promise<string> {
  const client = getClient();
  // Firecrawl's batch-scrape lets us pass an explicit URL list rather than crawl-from-root.
  const res = await client.asyncBatchScrapeUrls(urls, {
    formats: ['markdown'],
  });
  if (!res.success) throw new Error(`Firecrawl batch-scrape submit failed: ${(res as { error?: string }).error ?? 'unknown'}`);
  // In SDK v4 the id field on BatchScrapeResponse is optional; guard against undefined.
  if (!res.id) throw new Error('Firecrawl batch-scrape submit returned no job id');
  return res.id;
}

export interface CrawlPollResult {
  status: 'completed' | 'in_progress' | 'failed';
  pages: ScrapedPage[];
  error?: string;
}

// Poll a previously started crawl job. Trims markdown to MARKDOWN_EXCERPT_CHARS.
export async function pollCrawl(jobId: string): Promise<CrawlPollResult> {
  const client = getClient();
  const res = await client.checkBatchScrapeStatus(jobId);
  if (!res.success) {
    return { status: 'failed', pages: [], error: (res as { error?: string }).error ?? 'unknown' };
  }
  const status =
    res.status === 'completed' ? 'completed' : res.status === 'failed' ? 'failed' : 'in_progress';
  const pages: ScrapedPage[] = (res.data ?? []).map((d: any) => ({
    url: (d.metadata?.sourceURL ?? d.metadata?.url ?? '') as string,
    title: (d.metadata?.title as string | undefined) ?? null,
    metaDescription: (d.metadata?.description as string | undefined) ?? null,
    markdownExcerpt: ((d.markdown as string | undefined) ?? '').slice(0, MARKDOWN_EXCERPT_CHARS),
  }));
  return { status, pages, error: (res as { error?: string }).error };
}
