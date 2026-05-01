// lib/hooks/use-crawl-job.ts
'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { CrawlJob } from '@/lib/types';

const TERMINAL: CrawlJob['status'][] = ['ready_for_review', 'failed', 'archived', 'awaiting_url_selection'];

export function useCrawlJob(id: string | null) {
  return useSWR<CrawlJob>(id ? `/api/sources/crawls/${id}` : null, fetcher, {
    refreshInterval: (data) => {
      if (!data) return 3000;
      return TERMINAL.includes(data.status) ? 0 : 3000;
    },
    revalidateOnFocus: false,
  });
}
