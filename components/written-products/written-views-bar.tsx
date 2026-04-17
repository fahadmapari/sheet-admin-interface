'use client';

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export type CustomView = {
  id: string;
  name: string;
  columns: string[];
};

const MAIN_COLUMNS = [
  { id: 'textLink', label: 'Text Link' },
  { id: 'country', label: 'Country' },
  { id: 'cityDestination', label: 'City / Destination' },
  { id: 'state', label: 'State' },
  { id: 'tourType', label: 'Tour Type' },
];

const STATUS_COLUMNS = [
  { id: 'ccOk', label: 'CC OK' },
  { id: 'isOk', label: 'IS OK' },
  { id: 'rrOk', label: 'RR OK' },
  { id: 'ssOk', label: 'SS OK' },
  { id: 'contentExist', label: 'Content' },
  { id: 'b2b', label: 'B2B' },
  { id: 'b2c', label: 'B2C' },
  { id: 'ssNotes', label: 'SS Notes' },
];

const ALL_DEFAULT_COLUMNS = [
  ...MAIN_COLUMNS.map((c) => c.id),
  ...STATUS_COLUMNS.map((c) => c.id),
];

interface WrittenViewsBarProps {
  activeViewId: string;
  customViews: CustomView[];
  onViewSelect: (id: string) => void;
  onViewDelete: (id: string) => void;
  onViewAdd: (view: CustomView) => void;
}

export function WrittenViewsBar({
  activeViewId,
  customViews,
  onViewSelect,
  onViewDelete,
  onViewAdd,
}: WrittenViewsBarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        aria-pressed={activeViewId === 'default'}
        className={cn(
          'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors',
          activeViewId === 'default'
            ? 'bg-[hsl(var(--text-primary))] text-[hsl(var(--background))]'
            : 'border border-[hsl(var(--border))] text-[hsl(var(--text-secondary))] hover:border-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))]',
        )}
        onClick={() => onViewSelect('default')}
      >
        Default
      </button>

      {customViews.map((view) => (
        <span
          key={view.id}
          role="group"
          aria-label={view.name}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors',
            activeViewId === view.id
              ? 'bg-[hsl(var(--text-primary))] text-[hsl(var(--background))]'
              : 'border border-[hsl(var(--border))] text-[hsl(var(--text-secondary))] hover:border-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))]',
          )}
        >
          <button type="button" aria-pressed={activeViewId === view.id} onClick={() => onViewSelect(view.id)}>
            {view.name}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewDelete(view.id);
            }}
            className={cn(
              'ml-0.5 rounded-full transition-opacity',
              activeViewId === view.id ? 'opacity-70 hover:opacity-100' : 'opacity-40 hover:opacity-80',
            )}
            aria-label={`Delete ${view.name} view`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      <Button
        variant="outline"
        size="sm"
        className="h-7 rounded-full text-xs gap-1 px-3"
        onClick={() => setDialogOpen(true)}
      >
        <Plus className="h-3 w-3" />
        Add Custom View
      </Button>

      <AddCustomViewDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={(view) => {
          onViewAdd(view);
          setDialogOpen(false);
        }}
      />
    </div>
  );
}

function AddCustomViewDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (view: CustomView) => void;
}) {
  const [name, setName] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(ALL_DEFAULT_COLUMNS),
  );

  useEffect(() => {
    if (open) {
      setName('');
      setSelectedColumns(new Set(ALL_DEFAULT_COLUMNS));
    }
  }, [open]);

  function toggle(id: string) {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const canSave = name.trim().length > 0 && selectedColumns.size > 0;

  function handleSave() {
    if (!canSave) return;
    onSave({
      id: crypto.randomUUID(),
      name: name.trim(),
      columns: [...selectedColumns],
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom View</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="View name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && canSave) handleSave(); }}
            autoFocus
          />
          <ScrollArea className="h-72 rounded-md border border-[hsl(var(--border))] p-3">
            <div className="space-y-4">
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--text-tertiary))]">
                  Main Columns
                </p>
                <div className="space-y-1">
                  {MAIN_COLUMNS.map((col) => (
                    <label
                      key={col.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-[hsl(var(--surface))]"
                    >
                      <Checkbox
                        checked={selectedColumns.has(col.id)}
                        onCheckedChange={() => toggle(col.id)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-xs text-[hsl(var(--text-secondary))]">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--text-tertiary))]">
                  Status Columns
                </p>
                <div className="space-y-1">
                  {STATUS_COLUMNS.map((col) => (
                    <label
                      key={col.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-[hsl(var(--surface))]"
                    >
                      <Checkbox
                        checked={selectedColumns.has(col.id)}
                        onCheckedChange={() => toggle(col.id)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-xs text-[hsl(var(--text-secondary))]">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!canSave}>
            Save View
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
