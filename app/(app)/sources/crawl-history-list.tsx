'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { fetcher } from '@/lib/fetcher';
import type { CrawlJobSummary, CrawlJobStatus } from '@/lib/types';

function statusVariant(status: CrawlJobStatus): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'failed') return 'destructive';
  if (status === 'ready_for_review') return 'default';
  if (status === 'archived') return 'outline';
  return 'secondary';
}

function statusLabel(status: CrawlJobStatus): string {
  return status.replace(/_/g, ' ');
}

export function CrawlHistoryList() {
  const [showArchived, setShowArchived] = useState(false);
  const url = `/api/sources/crawls${showArchived ? '?archived=true' : ''}`;
  const { data, isLoading, error } = useSWR<{ jobs: CrawlJobSummary[] }>(url, fetcher);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Switch id="archived" checked={showArchived} onCheckedChange={setShowArchived} />
        <Label htmlFor="archived" className="text-xs">
          Show archived
        </Label>
      </div>
      {error && <p className="text-sm text-red-500">{error.message}</p>}
      {isLoading && <p className="text-sm text-[hsl(var(--text-tertiary))]">Loading...</p>}
      {data && data.jobs.length === 0 && (
        <p className="text-sm text-[hsl(var(--text-tertiary))]">No crawls yet.</p>
      )}
      {data && data.jobs.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {data.jobs.map((j) => (
            <Link
              key={j._id}
              href={`/sources/crawls/${j._id}`}
              className="flex items-center gap-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 hover:bg-[hsl(var(--surface))]"
            >
              <Badge variant={statusVariant(j.status)}>{statusLabel(j.status)}</Badge>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-sm font-medium">{j.providerName}</p>
                <p className="truncate text-xs text-[hsl(var(--text-tertiary))]">{j.rootUrl}</p>
              </div>
              <p className="text-xs text-[hsl(var(--text-tertiary))]">
                {j.candidateCount} candidates · {j.importedCount} imported
              </p>
              <p className="text-xs text-[hsl(var(--text-tertiary))]">
                {new Date(j.submittedAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
