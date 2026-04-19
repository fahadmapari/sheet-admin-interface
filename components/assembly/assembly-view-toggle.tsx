'use client';

import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AssemblyView } from '@/lib/hooks/use-assembly-view';

interface AssemblyViewToggleProps {
  view: AssemblyView;
  onChange: (view: AssemblyView) => void;
}

export function AssemblyViewToggle({ view, onChange }: AssemblyViewToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Assembly view"
      className="hidden items-center overflow-hidden rounded-md border border-[hsl(var(--border))] md:inline-flex"
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        role="radio"
        aria-checked={view === 'list'}
        aria-label="List view"
        className={cn(
          'h-8 rounded-none border-r border-[hsl(var(--border))] px-3',
          view === 'list'
            ? 'bg-[hsl(var(--surface-raised))] text-[hsl(var(--text-primary))]'
            : 'text-[hsl(var(--text-tertiary))]',
        )}
        onClick={() => onChange('list')}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        role="radio"
        aria-checked={view === 'board'}
        aria-label="Board view"
        className={cn(
          'h-8 rounded-none px-3',
          view === 'board'
            ? 'bg-[hsl(var(--surface-raised))] text-[hsl(var(--text-primary))]'
            : 'text-[hsl(var(--text-tertiary))]',
        )}
        onClick={() => onChange('board')}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  );
}
