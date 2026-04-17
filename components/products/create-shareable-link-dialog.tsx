'use client';

import { useState, useMemo } from 'react';
import { Copy, Check, Link } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useColumnGroups } from '@/lib/hooks/use-column-groups';
import { FIELD_LABELS } from '@/lib/constants';
import type { VisibilityState } from '@tanstack/react-table';
import type { Filters } from '@/lib/product-filters';
import {
  MULTI_SELECT_FILTERS,
  TRI_STATE_FILTERS,
  PRESENCE_FILTERS,
} from '@/lib/product-filters';

const COMPOSITE_TO_FIELDS: Record<string, string[]> = {
  product: ['productName', 'duration'],
  location: ['city', 'country'],
  type: ['productType'],
  status: ['productStatus'],
};

type ExpiryOption = '7d' | '30d' | '90d' | '1y' | 'never';

const EXPIRY_OPTIONS: { label: string; value: ExpiryOption }[] = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
  { label: '1 year', value: '1y' },
  { label: 'Never', value: 'never' },
];

function expiryToIso(option: ExpiryOption): string | null {
  if (option === 'never') return null;
  const days = option === '7d' ? 7 : option === '30d' ? 30 : option === '90d' ? 90 : 365;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function getFilterSummary(filters: Filters): string {
  const parts: string[] = [];
  for (const { key, label } of MULTI_SELECT_FILTERS) {
    const values = filters[key];
    if (Array.isArray(values) && values.length > 0) {
      parts.push(`${label}: ${values.join(', ')}`);
    }
  }
  for (const { key, label } of TRI_STATE_FILTERS) {
    const val = filters[key];
    if (val !== 'all') {
      parts.push(`${label}: ${val === 'yes' ? 'Yes' : 'No'}`);
    }
  }
  for (const { key, label } of PRESENCE_FILTERS) {
    const val = filters[key];
    if (val !== 'all') {
      parts.push(`${label}: ${val === 'has' ? 'Has value' : 'Missing'}`);
    }
  }
  return parts.length > 0 ? parts.join(' · ') : 'All products';
}

interface CreateShareableLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnVisibility: VisibilityState;
  filters: Filters;
  productCount: number;
}

export function CreateShareableLinkDialog({
  open,
  onOpenChange,
  columnVisibility,
  filters,
  productCount,
}: CreateShareableLinkDialogProps) {
  const { groups } = useColumnGroups();

  const initialColumns = useMemo(() => {
    const visible = new Set<string>();
    for (const [compositeId, fields] of Object.entries(COMPOSITE_TO_FIELDS)) {
      if (columnVisibility[compositeId] === true) {
        for (const f of fields) visible.add(f);
      }
    }
    const allRawFields = groups.flatMap((g) => g.fields);
    for (const field of allRawFields) {
      if (columnVisibility[field] === true) visible.add(field);
    }
    return visible;
  }, [columnVisibility, groups]);

  const [title, setTitle] = useState('');
  const [expiry, setExpiry] = useState<ExpiryOption>('never');
  const [visibleToTeam, setVisibleToTeam] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(initialColumns));
  const [isCreating, setIsCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl = createdToken
    ? `${window.location.origin}/share/${createdToken}`
    : '';

  function handleColumnToggle(fieldId: string, checked: boolean) {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (checked) next.add(fieldId);
      else next.delete(fieldId);
      return next;
    });
  }

  async function handleCreate() {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (selectedColumns.size === 0) {
      toast.error('Please select at least one column');
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch('/api/shareables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          expiresAt: expiryToIso(expiry),
          visibleToTeam,
          columns: Array.from(selectedColumns),
          filters,
        }),
      });
      const data = await res.json() as { token?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to create link');
      setCreatedToken(data.token!);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create link');
    } finally {
      setIsCreating(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    onOpenChange(false);
    setTimeout(() => {
      setTitle('');
      setExpiry('never');
      setVisibleToTeam(false);
      setSelectedColumns(new Set(initialColumns));
      setCreatedToken(null);
      setCopied(false);
    }, 200);
  }

  const filterSummary = useMemo(() => getFilterSummary(filters), [filters]);

  if (createdToken) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Shareable Link Created
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-[hsl(var(--text-secondary))]">
              Your link is ready. Anyone with this URL can view the data.
            </p>
            <div className="flex items-center gap-2 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2">
              <span className="flex-1 truncate text-sm font-mono">{shareUrl}</span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={handleCopy}>
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Create Shareable Link
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-5 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="share-title">Title</Label>
            <Input
              id="share-title"
              placeholder="e.g. France products for review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Expiry</Label>
            <div className="flex flex-wrap gap-2">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setExpiry(opt.value)}
                  className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                    expiry === opt.value
                      ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                      : 'border-[hsl(var(--border))] bg-[hsl(var(--surface))] hover:bg-[hsl(var(--surface-hover))]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="share-team">Visible to team</Label>
              <p className="mt-0.5 text-xs text-[hsl(var(--text-tertiary))]">
                Show this link in teammates&apos; Team Links tab
              </p>
            </div>
            <Switch
              id="share-team"
              checked={visibleToTeam}
              onCheckedChange={setVisibleToTeam}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Active filters</Label>
            <p className="text-sm text-[hsl(var(--text-secondary))] leading-relaxed">
              {filterSummary}
            </p>
            <p className="text-xs text-[hsl(var(--text-tertiary))]">
              {productCount} product{productCount !== 1 ? 's' : ''} will be visible
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Columns ({selectedColumns.size} selected)</Label>
            <ScrollArea className="h-48 rounded-md border border-[hsl(var(--border))] p-3">
              <div className="flex flex-col gap-3">
                {groups.map((group) => (
                  <div key={group.id}>
                    <p className="mb-1.5 text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase tracking-wide">
                      {group.label}
                    </p>
                    <div className="flex flex-col gap-1">
                      {group.fields.map((fieldId) => (
                        <div key={fieldId} className="flex items-center gap-2">
                          <Checkbox
                            id={`col-${fieldId}`}
                            checked={selectedColumns.has(fieldId)}
                            onCheckedChange={(checked) => handleColumnToggle(fieldId, !!checked)}
                          />
                          <label
                            htmlFor={`col-${fieldId}`}
                            className="text-sm cursor-pointer select-none"
                          >
                            {FIELD_LABELS[fieldId as keyof typeof FIELD_LABELS] ?? fieldId}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isCreating || !title.trim() || selectedColumns.size === 0}>
            {isCreating ? 'Creating\u2026' : 'Create Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
