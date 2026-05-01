// app/(app)/sources/crawls/[id]/url-selection.tsx
'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

const TOUR_HINTS = ['/tour', '/experience', '/excursion', '/visit', '/activity'];
const MAX = 500;

function isLikelyTour(url: string): boolean {
  const lower = url.toLowerCase();
  return TOUR_HINTS.some((h) => lower.includes(h));
}

export function UrlSelection({
  jobId,
  urls,
  onStarted,
}: {
  jobId: string;
  urls: string[];
  onStarted: () => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(urls.filter(isLikelyTour)),
  );
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return urls;
    const q = query.toLowerCase();
    return urls.filter((u) => u.toLowerCase().includes(q));
  }, [urls, query]);

  function toggle(url: string) {
    const next = new Set(selected);
    if (next.has(url)) next.delete(url);
    else next.add(url);
    setSelected(next);
  }

  function selectAllVisible() {
    const next = new Set(selected);
    for (const u of filtered) next.add(u);
    setSelected(next);
  }

  function deselectAllVisible() {
    const next = new Set(selected);
    for (const u of filtered) next.delete(u);
    setSelected(next);
  }

  async function handleStart() {
    if (selected.size === 0) {
      toast.error('Select at least one URL');
      return;
    }
    if (selected.size > MAX) {
      toast.error(`Cannot scrape more than ${MAX} URLs`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sources/crawls/${jobId}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedUrls: Array.from(selected) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to start scrape');
      }
      onStarted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start scrape');
    } finally {
      setSubmitting(false);
    }
  }

  const overLimit = selected.size > MAX;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-[hsl(var(--text-tertiary))]" strokeWidth={1.5} />
          <Input
            placeholder="Filter URLs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectAllVisible}>
            Select all visible
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAllVisible}>
            Deselect all visible
          </Button>
        </div>
      </div>
      <p className={`text-xs ${overLimit ? 'text-red-500' : 'text-[hsl(var(--text-tertiary))]'}`}>
        Selected: {selected.size} / {MAX}
      </p>
      <ScrollArea className="h-[480px] rounded-md border border-[hsl(var(--border))]">
        <div className="flex flex-col">
          {filtered.map((u) => (
            <label
              key={u}
              className="flex cursor-pointer items-center gap-2 border-b border-[hsl(var(--border))] px-3 py-2 hover:bg-[hsl(var(--surface))] last:border-b-0"
            >
              <Checkbox
                checked={selected.has(u)}
                onCheckedChange={() => toggle(u)}
              />
              <span className="truncate text-xs">{u}</span>
            </label>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-sm text-[hsl(var(--text-tertiary))]">
              No URLs match this filter.
            </p>
          )}
        </div>
      </ScrollArea>
      <div className="flex justify-end">
        <Button onClick={handleStart} disabled={submitting || selected.size === 0 || overLimit}>
          {submitting ? 'Starting...' : `Start Scrape (${selected.size})`}
        </Button>
      </div>
    </div>
  );
}
