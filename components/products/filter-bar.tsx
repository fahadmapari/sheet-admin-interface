'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { PRODUCT_STATUSES } from '@/lib/constants';
import type { FiltersResponse } from '@/lib/types';
import { fetcher } from '@/lib/fetcher';
import {
  DEFAULT_FILTERS,
  DEFAULT_OPEN_FILTER_SECTIONS,
  FILTER_SECTIONS,
  MULTI_SELECT_FILTERS,
  PRESENCE_FILTERS,
  TRI_STATE_FILTERS,
  getActiveFilterCount,
  getActiveFilterCountForSection,
  getPresenceChipValue,
  getTriStateChipValue,
  type Filters,
  type PresenceState,
  type TriState,
} from '@/lib/product-filters';

interface FilterBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

function FilterSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--text-tertiary))]">
        {label}
      </span>
      {children}
    </div>
  );
}

function MultiSelectPopover({
  label,
  options,
  selected,
  onChange,
  searchable = false,
  emptyMessage = 'No results found.',
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
  emptyMessage?: string;
}) {
  const [query, setQuery] = useState('');

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const hasSelection = selected.length > 0;
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((opt) => opt.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`justify-between gap-1.5 ${hasSelection ? 'border-[hsl(var(--accent))] text-[hsl(var(--accent))]' : ''}`}
        >
          {label}
          {hasSelection && (
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[10px] font-medium text-[hsl(var(--accent-foreground))]">
              {selected.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        {searchable && (
          <div className="border-b border-[hsl(var(--border))] p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              className="flex h-8 w-full rounded-md border border-[hsl(var(--border))] bg-transparent px-2 text-xs shadow-sm outline-none transition-colors placeholder:text-[hsl(var(--text-tertiary))] focus-visible:ring-1 focus-visible:ring-[hsl(var(--ring))]"
            />
          </div>
        )}
        <div className="max-h-64 overflow-y-auto">
          <div className="p-2 space-y-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <label
                  key={opt}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-[hsl(var(--surface))]"
                >
                  <Checkbox
                    checked={selected.includes(opt)}
                    onCheckedChange={() => toggle(opt)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-xs">{opt}</span>
                </label>
              ))
            ) : (
              <div className="px-1 py-3 text-xs text-[hsl(var(--text-tertiary))]">{emptyMessage}</div>
            )}
          </div>
        </div>
        {hasSelection && (
          <>
            <Separator />
            <div className="p-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={() => onChange([])}
              >
                Clear
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function TriStateToggle({
  value,
  onChange,
}: {
  value: TriState;
  onChange: (v: TriState) => void;
}) {
  return (
    <div className="flex h-8 w-fit self-start items-center overflow-hidden rounded-md border border-[hsl(var(--border))] text-xs">
      {(['all', 'yes', 'no'] as const).map((val, idx) => (
        <button
          key={val}
          onClick={() => onChange(val)}
          className={`px-3 h-full text-xs transition-colors ${
            value === val
              ? 'bg-[hsl(var(--text-primary))] font-medium text-[hsl(var(--background))]'
              : 'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--surface))] hover:text-[hsl(var(--text-primary))]'
          } ${idx > 0 ? 'border-l border-[hsl(var(--border))]' : ''}`}
        >
          {val === 'all' ? 'All' : val === 'yes' ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  );
}

function PresenceToggle({
  value,
  onChange,
}: {
  value: PresenceState;
  onChange: (v: PresenceState) => void;
}) {
  return (
    <div className="flex h-8 w-fit self-start items-center overflow-hidden rounded-md border border-[hsl(var(--border))] text-xs">
      {(['all', 'has', 'missing'] as const).map((val, idx) => (
        <button
          key={val}
          onClick={() => onChange(val)}
          className={`px-3 h-full text-xs transition-colors ${
            value === val
              ? 'bg-[hsl(var(--text-primary))] font-medium text-[hsl(var(--background))]'
              : 'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--surface))] hover:text-[hsl(var(--text-primary))]'
          } ${idx > 0 ? 'border-l border-[hsl(var(--border))]' : ''}`}
        >
          {val === 'all' ? 'All' : val === 'has' ? 'Has' : 'Missing'}
        </button>
      ))}
    </div>
  );
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/10 px-2 py-0.5 text-xs font-medium text-[hsl(var(--accent))]">
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 hover:bg-[hsl(var(--accent))]/20 transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const { data: filterOptions } = useSWR<FiltersResponse>('/api/filters', fetcher, {
    dedupingInterval: 300_000,
  });

  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const activeCount = getActiveFilterCount(filters);
  const isActive = activeCount > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Trigger button */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`gap-1.5 ${isActive ? 'border-[hsl(var(--accent))] text-[hsl(var(--accent))]' : ''}`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {isActive && (
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[10px] font-medium text-[hsl(var(--accent-foreground))]">
                {activeCount}
              </span>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent side="right" style={{ width: '390px', maxWidth: '100vw' }} className="flex flex-col gap-0 p-0">
          <SheetHeader className="flex flex-row items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4">
            <SheetTitle>Filters</SheetTitle>
            {isActive && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))]"
                onClick={() => onFiltersChange(DEFAULT_FILTERS)}
              >
                Clear all
              </Button>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <Accordion
              type="multiple"
              defaultValue={DEFAULT_OPEN_FILTER_SECTIONS}
              className="px-5"
            >
              {FILTER_SECTIONS.map((section) => {
                const multiSelects = MULTI_SELECT_FILTERS.filter((filter) => filter.section === section);
                const triStates = TRI_STATE_FILTERS.filter((filter) => filter.section === section);
                const presenceFilters = PRESENCE_FILTERS.filter((filter) => filter.section === section);
                const sectionActiveCount = getActiveFilterCountForSection(filters, section);
                if (!multiSelects.length && !triStates.length && !presenceFilters.length) return null;

                return (
                  <AccordionItem key={section} value={section}>
                    <AccordionTrigger>
                      <span className="flex items-center gap-2">
                        {section}
                        {sectionActiveCount > 0 && (
                          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(var(--accent))] px-1 text-[10px] font-medium text-[hsl(var(--accent-foreground))]">
                            {sectionActiveCount}
                          </span>
                        )}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-col gap-4">
                        {multiSelects.map((filter) => {
                          const options =
                            filter.key === 'statuses'
                              ? [...new Set([...PRODUCT_STATUSES, ...(filterOptions?.[filter.responseKey] ?? [])])]
                              : filterOptions?.[filter.responseKey] ?? [];
                          return (
                            <FilterSection key={filter.key} label={filter.label}>
                              <MultiSelectPopover
                                label={filter.buttonLabel}
                                options={options}
                                selected={filters[filter.key]}
                                onChange={(v) => update(filter.key, v)}
                                searchable={filter.searchable}
                                emptyMessage={`No ${filter.label.toLowerCase()} values found.`}
                              />
                            </FilterSection>
                          );
                        })}
                        {triStates.map((filter) => (
                          <FilterSection key={filter.key} label={filter.label}>
                            <TriStateToggle value={filters[filter.key]} onChange={(v) => update(filter.key, v)} />
                          </FilterSection>
                        ))}
                        {presenceFilters.map((filter) => (
                          <FilterSection key={filter.key} label={filter.label}>
                            <PresenceToggle value={filters[filter.key]} onChange={(v) => update(filter.key, v)} />
                          </FilterSection>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </SheetContent>
      </Sheet>

      {/* Active filter chips */}
      {MULTI_SELECT_FILTERS.flatMap((filter) =>
        filters[filter.key].map((value) => (
          <ActiveChip
            key={`${filter.key}-${value}`}
            label={`${filter.label}: ${value}`}
            onRemove={() => update(filter.key, filters[filter.key].filter((current) => current !== value))}
          />
        ))
      )}
      {TRI_STATE_FILTERS.map((filter) =>
        filters[filter.key] !== 'all' ? (
          <ActiveChip
            key={filter.key}
            label={`${filter.chipLabel}: ${getTriStateChipValue(filters[filter.key])}`}
            onRemove={() => update(filter.key, 'all')}
          />
        ) : null
      )}
      {PRESENCE_FILTERS.map((filter) =>
        filters[filter.key] !== 'all' ? (
          <ActiveChip
            key={filter.key}
            label={`${filter.chipLabel}: ${getPresenceChipValue(filters[filter.key])}`}
            onRemove={() => update(filter.key, 'all')}
          />
        ) : null
      )}

      {isActive && (
        <button
          onClick={() => onFiltersChange(DEFAULT_FILTERS)}
          className="text-xs text-[hsl(var(--text-tertiary))] underline underline-offset-2 hover:text-[hsl(var(--text-primary))] transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
