'use client';

import type { VisibilityState } from '@tanstack/react-table';
import { Columns } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ALWAYS_VISIBLE_COLUMNS, COLUMN_GROUPS, FIELD_LABELS, VIEW_PRESETS } from '@/lib/constants';
import type { TourProduct } from '@/lib/types';

// All fields across all groups (in order)
const ALL_FIELDS = COLUMN_GROUPS.flatMap((g) => g.fields as readonly string[]);

const PRESET_LABELS: Record<string, string> = {
  overview: 'Overview',
  pricing: 'Pricing',
  ota: 'OTA',
  upload: 'Upload Workflow',
  tourDetails: 'Tour Details',
};

interface ColumnVisibilityPanelProps {
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: (v: VisibilityState) => void;
}

export function ColumnVisibilityPanel({
  columnVisibility,
  onColumnVisibilityChange,
}: ColumnVisibilityPanelProps) {
  function applyPreset(presetKey: string | 'all') {
    if (presetKey === 'all') {
      const next: VisibilityState = {};
      for (const field of ALL_FIELDS) {
        next[field] = true;
      }
      onColumnVisibilityChange(next);
      return;
    }

    const presetFields = new Set<string>(VIEW_PRESETS[presetKey] ?? []);
    const next: VisibilityState = {};
    for (const field of ALL_FIELDS) {
      next[field] = ALWAYS_VISIBLE_COLUMNS.has(field) || presetFields.has(field);
    }
    onColumnVisibilityChange(next);
  }

  function toggleColumn(fieldId: string) {
    if (ALWAYS_VISIBLE_COLUMNS.has(fieldId)) return;
    const current = columnVisibility[fieldId] !== false; // default is visible
    onColumnVisibilityChange({ ...columnVisibility, [fieldId]: !current });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Columns className="h-4 w-4" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        {/* View Presets */}
        <div className="p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            View Presets
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(PRESET_LABELS).map(([key, label]) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => applyPreset(key)}
              >
                {label}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => applyPreset('all')}
            >
              All Columns
            </Button>
          </div>
        </div>

        <Separator />

        {/* Grouped checkboxes */}
        <ScrollArea className="h-80">
          <div className="p-3 space-y-4">
            {COLUMN_GROUPS.map((group) => (
              <div key={group.id}>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {(group.fields as readonly string[]).map((field) => {
                    const isVisible = columnVisibility[field] !== false; // default is visible
                    const isSticky = ALWAYS_VISIBLE_COLUMNS.has(field);
                    const label = FIELD_LABELS[field as keyof Omit<TourProduct, 'rowIndex'>] ?? field;

                    return (
                      <label
                        key={field}
                        className="flex items-center gap-2 cursor-pointer group"
                      >
                        <Checkbox
                          checked={isVisible}
                          disabled={isSticky}
                          onCheckedChange={() => toggleColumn(field)}
                          className="h-3.5 w-3.5"
                        />
                        <span className={`text-xs ${isSticky ? 'text-muted-foreground' : 'group-hover:text-foreground'}`}>
                          {label}
                          {isSticky && <span className="ml-1 text-[10px] opacity-50">(pinned)</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <Separator />

        {/* Reset button */}
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={() => applyPreset('all')}
          >
            Reset to All
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
