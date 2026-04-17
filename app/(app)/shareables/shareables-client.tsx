'use client';

import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { Copy, Check, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetcher } from '@/lib/fetcher';
import type { ShareableLink } from '@/lib/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function isExpired(link: ShareableLink) {
  return !!link.expiresAt && new Date(link.expiresAt) < new Date();
}

function expiryLabel(link: ShareableLink) {
  if (!link.expiresAt) return 'Never';
  if (isExpired(link)) return 'Expired';
  return formatDate(link.expiresAt);
}

function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(`${window.location.origin}/share/${token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleCopy} title="Copy link">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function ShareableLinkRow({
  link,
  canDelete,
  onDelete,
}: {
  link: ShareableLink;
  canDelete: boolean;
  onDelete: (id: string) => void;
}) {
  const expired = isExpired(link);
  return (
    <div className={`flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] px-4 py-3 ${expired ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-sm">{link.title}</span>
          {expired && <Badge variant="outline" className="shrink-0 text-xs">Expired</Badge>}
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-[hsl(var(--text-tertiary))]">
          <span>Created {formatDate(link.createdAt)}</span>
          <span>·</span>
          <span>Expires: {expiryLabel(link)}</span>
          <span>·</span>
          <span>{link.columns.length} column{link.columns.length !== 1 ? 's' : ''}</span>
          {canDelete && (
            <>
              <span>·</span>
              <span>by you</span>
            </>
          )}
          {!canDelete && (
            <>
              <span>·</span>
              <span>by {link.createdBy}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <CopyLinkButton token={link.token} />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          title="Open link"
          onClick={() => window.open(`/share/${link.token}`, '_blank')}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-[hsl(var(--text-tertiary))] hover:text-red-500"
            title="Delete link"
            onClick={() => onDelete(link._id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm font-medium text-[hsl(var(--text-primary))]">{message}</p>
    </div>
  );
}

export function ShareablesClient() {
  const { mutate } = useSWRConfig();
  const { data: myLinks, isLoading: myLoading } = useSWR<ShareableLink[]>(
    '/api/shareables?scope=mine',
    fetcher,
  );
  const { data: teamLinks, isLoading: teamLoading } = useSWR<ShareableLink[]>(
    '/api/shareables?scope=team',
    fetcher,
  );

  async function handleDelete(id: string) {
    const res = await fetch(`/api/shareables/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Link deleted');
      mutate('/api/shareables?scope=mine');
    } else {
      toast.error('Failed to delete link');
    }
  }

  return (
    <Tabs defaultValue="mine">
      <TabsList>
        <TabsTrigger value="mine">
          My Links {myLinks ? `(${myLinks.length})` : ''}
        </TabsTrigger>
        <TabsTrigger value="team">
          Team Links {teamLinks ? `(${teamLinks.length})` : ''}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="mine" className="mt-4">
        {myLoading ? (
          <p className="text-sm text-[hsl(var(--text-tertiary))]">Loading…</p>
        ) : !myLinks?.length ? (
          <EmptyState message="You haven't created any shareable links yet." />
        ) : (
          <div className="flex flex-col gap-2">
            {myLinks.map((link) => (
              <ShareableLinkRow
                key={link._id}
                link={link}
                canDelete
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="team" className="mt-4">
        {teamLoading ? (
          <p className="text-sm text-[hsl(var(--text-tertiary))]">Loading…</p>
        ) : !teamLinks?.length ? (
          <EmptyState message="No team links shared yet." />
        ) : (
          <div className="flex flex-col gap-2">
            {teamLinks.map((link) => (
              <ShareableLinkRow
                key={link._id}
                link={link}
                canDelete={false}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
