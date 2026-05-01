// app/(app)/sources/crawls/[id]/candidates-table.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { ExternalLink, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ComboboxInput } from '@/components/ui/combobox-input';
import { fetcher } from '@/lib/fetcher';
import type { CrawlJob, ClassificationResult, FiltersResponse, Source } from '@/lib/types';

const DEFAULT_THRESHOLD = 75;

interface RowState {
  selected: boolean;
  tourName: string;
  city: string;
  country: string;
  manualOverride: boolean; // user toggled selection — don't let slider change it
}

function confidenceColor(c: number): string {
  if (c >= 80) return 'bg-green-500/15 text-green-700 dark:text-green-400';
  if (c >= 60) return 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
  return 'bg-[hsl(var(--surface))] text-[hsl(var(--text-tertiary))]';
}

export function CandidatesTable({
  job,
  onImported,
}: {
  job: CrawlJob;
  onImported: () => void;
}) {
  const { data: filters } = useSWR<FiltersResponse>('/api/filters', fetcher);
  const { data: imported, mutate: mutateImported } = useSWR<{ sources: Source[] }>(
    `/api/sources?provider=${encodeURIComponent(job.providerName)}`,
    fetcher,
  );
  const importedKeys = useMemo(() => {
    const set = new Set<string>();
    for (const s of imported?.sources ?? []) {
      if (s.crawlJobId === job._id) set.add(s.tourName);
    }
    return set;
  }, [imported, job._id]);

  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rowsByUrl, setRowsByUrl] = useState<Record<string, RowState>>(() =>
    initRows(job.classifications ?? [], DEFAULT_THRESHOLD, job),
  );

  // When threshold changes, update selection for rows the user hasn't manually overridden.
  useEffect(() => {
    setRowsByUrl((prev) => {
      const next = { ...prev };
      for (const c of job.classifications ?? []) {
        const r = next[c.url];
        if (r && !r.manualOverride) {
          next[c.url] = { ...r, selected: c.confidence >= threshold };
        }
      }
      return next;
    });
  }, [threshold, job.classifications]);

  const visible = useMemo(() => {
    const items = job.classifications ?? [];
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (c) =>
        c.url.toLowerCase().includes(q) ||
        (c.suggestedTourName ?? '').toLowerCase().includes(q),
    );
  }, [job.classifications, query]);

  function updateRow(url: string, patch: Partial<RowState>) {
    setRowsByUrl((prev) => ({
      ...prev,
      [url]: { ...prev[url], ...patch },
    }));
  }

  function toggleSelected(url: string) {
    setRowsByUrl((prev) => {
      const r = prev[url];
      return {
        ...prev,
        [url]: { ...r, selected: !r.selected, manualOverride: true },
      };
    });
  }

  const selectedCount = Object.values(rowsByUrl).filter(
    (r) => r.selected && !importedKeys.has(r.tourName),
  ).length;

  async function handleImport() {
    const items = (job.classifications ?? [])
      .filter((c) => {
        const r = rowsByUrl[c.url];
        return r?.selected && !importedKeys.has(r.tourName);
      })
      .map((c) => {
        const r = rowsByUrl[c.url];
        return {
          url: c.url,
          tourName: r.tourName,
          city: r.city,
          country: r.country,
          confidence: c.confidence,
        };
      });

    if (items.length === 0) {
      toast.error('Select at least one row to import');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/sources/crawls/${job._id}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Import failed');
      }
      const data = (await res.json()) as { importedCount: number; skippedCount: number };
      toast.success(
        `Imported ${data.importedCount}${data.skippedCount > 0 ? ` (${data.skippedCount} skipped)` : ''}`,
      );
      // Revalidate so newly-imported rows immediately show as imported.
      mutateImported();
      onImported();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-[hsl(var(--text-tertiary))]" strokeWidth={1.5} />
          <Input
            placeholder="Filter candidates..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <div className="flex flex-1 items-center gap-3 max-w-md">
          <span className="text-xs text-[hsl(var(--text-tertiary))] whitespace-nowrap">
            Confidence ≥ {threshold}
          </span>
          <Slider
            value={[threshold]}
            min={0}
            max={100}
            step={5}
            onValueChange={(v) => setThreshold(v[0])}
          />
        </div>
        <Button onClick={handleImport} disabled={submitting || selectedCount === 0}>
          {submitting ? 'Importing...' : `Import ${selectedCount} selected`}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border border-[hsl(var(--border))]">
        <table className="w-full text-sm">
          <thead className="bg-[hsl(var(--surface))] text-xs">
            <tr>
              <th className="w-8 p-2"></th>
              <th className="w-16 p-2 text-left">Score</th>
              <th className="p-2 text-left">Tour name</th>
              <th className="p-2 text-left">URL</th>
              <th className="p-2 text-left">City</th>
              <th className="p-2 text-left">Country</th>
              <th className="p-2 text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => {
              const r = rowsByUrl[c.url];
              if (!r) return null;
              const alreadyImported = importedKeys.has(r.tourName);
              return (
                <tr
                  key={c.url}
                  className={`border-t border-[hsl(var(--border))] ${alreadyImported ? 'opacity-60' : ''}`}
                >
                  <td className="p-2">
                    <Checkbox
                      checked={r.selected}
                      onCheckedChange={() => toggleSelected(c.url)}
                      disabled={alreadyImported}
                    />
                  </td>
                  <td className="p-2">
                    <Badge className={confidenceColor(c.confidence)}>{c.confidence}</Badge>
                  </td>
                  <td className="p-2">
                    <Input
                      value={r.tourName}
                      onChange={(e) => updateRow(c.url, { tourName: e.target.value })}
                      disabled={alreadyImported}
                      className="h-7"
                    />
                  </td>
                  <td className="max-w-xs p-2">
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 truncate text-xs text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))]"
                      title={c.url}
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                      <span className="truncate">{c.url}</span>
                    </a>
                  </td>
                  <td className="p-2 min-w-[160px]">
                    <ComboboxInput
                      value={r.city}
                      onChange={(v) => updateRow(c.url, { city: v })}
                      options={filters?.cities ?? []}
                    />
                  </td>
                  <td className="p-2 min-w-[160px]">
                    <ComboboxInput
                      value={r.country}
                      onChange={(v) => updateRow(c.url, { country: v })}
                      options={filters?.countries ?? []}
                    />
                  </td>
                  <td className="max-w-xs p-2">
                    <p
                      className="truncate text-xs text-[hsl(var(--text-tertiary))]"
                      title={c.geminiNotes ?? ''}
                    >
                      {c.geminiNotes ?? ''}
                    </p>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-sm text-[hsl(var(--text-tertiary))]">
                  No candidates match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function initRows(
  classifications: ClassificationResult[],
  threshold: number,
  job: CrawlJob,
): Record<string, RowState> {
  const out: Record<string, RowState> = {};
  for (const c of classifications) {
    out[c.url] = {
      selected: c.confidence >= threshold,
      tourName: c.suggestedTourName ?? c.title ?? '',
      city: c.suggestedCity ?? job.defaultCity,
      country: c.suggestedCountry ?? job.defaultCountry,
      manualOverride: false,
    };
  }
  return out;
}
