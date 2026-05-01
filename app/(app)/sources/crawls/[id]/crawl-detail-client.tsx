// app/(app)/sources/crawls/[id]/crawl-detail-client.tsx
'use client';

import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCrawlJob } from '@/lib/hooks/use-crawl-job';
import { InProgressCard } from './in-progress-card';
import { UrlSelection } from './url-selection';
import { CandidatesTable } from './candidates-table';

export function CrawlDetailClient({ id, isAdmin }: { id: string; isAdmin: boolean }) {
  const { data: job, error, isLoading, mutate } = useCrawlJob(id);

  async function handleRetry() {
    try {
      const res = await fetch(`/api/sources/crawls/${id}/retry`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Retry failed');
      }
      toast.success('Retrying...');
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Retry failed');
    }
  }

  if (isLoading || !job) {
    return <p className="text-sm text-[hsl(var(--text-tertiary))]">Loading...</p>;
  }
  if (error) {
    return <p className="text-sm text-red-500">{error.message}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/sources" className="flex w-fit items-center gap-1 text-xs text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))]">
        <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
        Back to Sources
      </Link>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{job.providerName}</h1>
            <Badge variant="secondary">{job.status.replace(/_/g, ' ')}</Badge>
          </div>
          <a
            href={job.rootUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[hsl(var(--text-tertiary))] hover:underline"
          >
            {job.rootUrl}
          </a>
        </div>
      </div>

      {(job.status === 'mapping' ||
        job.status === 'scraping' ||
        job.status === 'classifying') && <InProgressCard status={job.status} />}

      {job.status === 'awaiting_url_selection' && (
        <UrlSelection
          jobId={id}
          urls={job.mapResult?.urls ?? []}
          onStarted={() => mutate()}
        />
      )}
      {job.status === 'ready_for_review' && (
        <CandidatesTable job={job} onImported={() => mutate()} />
      )}

      {job.status === 'failed' && (
        <div className="flex flex-col items-start gap-2 rounded-md border border-red-500/30 bg-red-500/5 p-4">
          <p className="text-sm font-medium text-red-500">Crawl failed</p>
          <p className="text-xs text-[hsl(var(--text-tertiary))]">{job.error ?? 'Unknown error'}</p>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} />
              Retry
            </Button>
          )}
        </div>
      )}

      {job.status === 'archived' && (
        <p className="text-sm text-[hsl(var(--text-tertiary))]">This crawl is archived.</p>
      )}
    </div>
  );
}
