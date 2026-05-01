'use client';

import { useState } from 'react';
import { ExternalLink, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useImportedSources } from '@/lib/hooks/use-imported-sources';

function confidenceVariant(c: number): 'default' | 'secondary' | 'outline' {
  if (c >= 80) return 'default';
  if (c >= 60) return 'secondary';
  return 'outline';
}

export function ImportedSourcesList({ isAdmin }: { isAdmin: boolean }) {
  const [q, setQ] = useState('');
  const { data, isLoading, error } = useImportedSources({ q });
  const { mutate } = useSWRConfig();

  async function handleDelete(id: string) {
    if (!confirm('Delete this source?')) return;
    try {
      const res = await fetch(`/api/sources/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Deleted');
      // Revalidate every cached sources query.
      mutate((key) => typeof key === 'string' && key.startsWith('/api/sources'), undefined, {
        revalidate: true,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-[hsl(var(--text-tertiary))]" strokeWidth={1.5} />
        <Input
          placeholder="Search by tour name or URL..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
      </div>
      {error && <p className="text-sm text-red-500">{error.message}</p>}
      {isLoading && <p className="text-sm text-[hsl(var(--text-tertiary))]">Loading...</p>}
      {data && data.sources.length === 0 && (
        <p className="text-sm text-[hsl(var(--text-tertiary))]">No imported sources yet.</p>
      )}
      {data && data.sources.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {data.sources.map((s) => (
            <div
              key={s._id}
              className="flex items-center gap-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2"
            >
              <Badge variant={confidenceVariant(s.geminiConfidence)}>
                {s.geminiConfidence}
              </Badge>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-sm font-medium">{s.tourName}</p>
                <p className="truncate text-xs text-[hsl(var(--text-tertiary))]">
                  {s.providerName} · {s.city}, {s.country}
                </p>
              </div>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-[hsl(var(--surface))]"
                title="Open source URL"
              >
                <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
              </a>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(s._id)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
