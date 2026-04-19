'use client';

import { useState, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { ExternalLink, Edit2, Trash2, Plus, X, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { fetcher } from '@/lib/fetcher';
import type { SheetLink } from '@/lib/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function useDebounce(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Tag Input ────────────────────────────────────────────────────────────────

function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState('');

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = input.trim();
      if (trimmed && !tags.includes(trimmed)) {
        onChange([...tags, trimmed]);
      }
      setInput('');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1 min-h-[28px]">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="flex items-center gap-1 text-xs">
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="ml-0.5 hover:text-red-500"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a tag and press Enter"
        className="h-8 text-sm"
      />
    </div>
  );
}

// ── Add / Edit Dialog ────────────────────────────────────────────────────────

interface DialogState {
  open: boolean;
  mode: 'add' | 'edit';
  link?: SheetLink;
}

function LinkDialog({
  state,
  onClose,
  onSaved,
}: {
  state: DialogState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [visibleToTeam, setVisibleToTeam] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state.open) {
      setName(state.link?.name ?? '');
      setUrl(state.link?.url ?? '');
      setTags(state.link?.tags ?? []);
      setVisibleToTeam(state.link?.visibleToTeam ?? false);
    }
  }, [state.open, state.link]);

  const canSave = name.trim().length > 0 && url.trim().length > 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const body = { name: name.trim(), url: url.trim(), tags, visibleToTeam };
      const res =
        state.mode === 'add'
          ? await fetch('/api/sheet-links', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            })
          : await fetch(`/api/sheet-links/${state.link!._id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });

      if (res.ok) {
        toast.success(state.mode === 'add' ? 'Link saved' : 'Link updated');
        onSaved();
        onClose();
      } else {
        const data = await res.json();
        if (res.status === 403) {
          toast.error("You don't have permission to modify this link");
        } else {
          toast.error(data.error ?? 'Something went wrong');
        }
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={state.open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{state.mode === 'add' ? 'Add Link' : 'Edit Link'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sl-name">Name</Label>
            <Input
              id="sl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q1 Net Rates"
              className="h-8 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sl-url">URL</Label>
            <Input
              id="sl-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/…"
              className="h-8 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>
              Tags{' '}
              <span className="text-[hsl(var(--text-tertiary))] font-normal">(optional)</span>
            </Label>
            <TagInput tags={tags} onChange={setTags} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="sl-team" className="cursor-pointer">
              Share with team
            </Label>
            <Switch
              id="sl-team"
              checked={visibleToTeam}
              onCheckedChange={setVisibleToTeam}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!canSave || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Sheet Link Row ───────────────────────────────────────────────────────────

function SheetLinkRow({
  link,
  canEdit,
  onEdit,
  onDelete,
  onTagClick,
}: {
  link: SheetLink;
  canEdit: boolean;
  onEdit: (link: SheetLink) => void;
  onDelete: (id: string) => void;
  onTagClick: (tag: string) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{link.name}</p>
        <div className="mt-0.5 flex items-center gap-1 min-w-0">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-xs text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))] hover:underline flex items-center gap-1 min-w-0"
          >
            <span className="truncate">{link.url}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>
        {link.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {link.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-xs cursor-pointer hover:bg-[hsl(var(--surface))]"
                onClick={() => onTagClick(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <p className="mt-1 text-xs text-[hsl(var(--text-tertiary))]">
          {canEdit
            ? `Added ${formatDate(link.createdAt)}`
            : `by ${link.createdBy} · ${formatDate(link.createdAt)}`}
        </p>
      </div>
      {canEdit && (
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="Edit"
            onClick={() => onEdit(link)}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-[hsl(var(--text-tertiary))] hover:text-red-500"
            title="Delete"
            onClick={() => onDelete(link._id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
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

// ── Main Client ──────────────────────────────────────────────────────────────

export function SheetLinksClient() {
  const { mutate } = useSWRConfig();
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const [dialog, setDialog] = useState<DialogState>({ open: false, mode: 'add' });

  const myKey = `/api/sheet-links?scope=mine&q=${encodeURIComponent(q)}`;
  const teamKey = `/api/sheet-links?scope=team&q=${encodeURIComponent(q)}`;

  const { data: myLinks, isLoading: myLoading } = useSWR<SheetLink[]>(myKey, fetcher);
  const { data: teamLinks, isLoading: teamLoading } = useSWR<SheetLink[]>(teamKey, fetcher);

  function openAdd() {
    setDialog({ open: true, mode: 'add' });
  }

  function openEdit(link: SheetLink) {
    setDialog({ open: true, mode: 'edit', link });
  }

  function closeDialog() {
    setDialog((d) => ({ ...d, open: false }));
  }

  function handleSaved() {
    mutate(myKey);
    mutate(teamKey);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/sheet-links/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Link deleted');
      mutate(myKey);
    } else {
      const data = await res.json();
      if (res.status === 403) {
        toast.error("You don't have permission to delete this link");
      } else {
        toast.error(data.error ?? 'Something went wrong');
      }
    }
  }

  return (
    <>
      <LinkDialog state={dialog} onClose={closeDialog} onSaved={handleSaved} />

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--text-tertiary))]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search links, tags…"
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Button size="sm" onClick={openAdd} className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Link
        </Button>
      </div>

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
            <EmptyState
              message={q ? 'No links match your search.' : "You haven't saved any links yet."}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {myLinks.map((link) => (
                <SheetLinkRow
                  key={link._id}
                  link={link}
                  canEdit
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onTagClick={setSearch}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          {teamLoading ? (
            <p className="text-sm text-[hsl(var(--text-tertiary))]">Loading…</p>
          ) : !teamLinks?.length ? (
            <EmptyState
              message={
                q ? 'No team links match your search.' : 'No team links shared yet.'
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              {teamLinks.map((link) => (
                <SheetLinkRow
                  key={link._id}
                  link={link}
                  canEdit={false}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onTagClick={setSearch}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
