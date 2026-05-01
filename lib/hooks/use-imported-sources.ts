// lib/hooks/use-imported-sources.ts
'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { Source } from '@/lib/types';

export interface SourcesQuery {
  q?: string;
  country?: string;
  city?: string;
  provider?: string;
}

export function useImportedSources(query: SourcesQuery) {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.country) params.set('country', query.country);
  if (query.city) params.set('city', query.city);
  if (query.provider) params.set('provider', query.provider);
  const qs = params.toString();
  return useSWR<{ sources: Source[] }>(`/api/sources${qs ? `?${qs}` : ''}`, fetcher);
}
