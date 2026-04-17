'use client';

import { useMemo, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import type { WrittenProduct } from '@/lib/types';
import {
  DEFAULT_WP_FILTERS,
  WP_FILTER_SECTIONS,
  WP_DEFAULT_OPEN_FILTER_SECTIONS,
  WP_MULTI_SELECT_FILTERS,
  WP_TRI_STATE_FILTERS,
  getWPActiveFilterCount,
  getWPActiveFilterCountForSection,
  type WPTriState,
  type WrittenProductFilters,
} from '@/lib/written-product-filters';

interface WrittenProductFilterBarProps {
  allProducts: WrittenProduct[];
  filters: WrittenProductFilters;
  onFiltersChange: (filters: WrittenProductFilters) => void;
}

function MultiSelectPopover({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState('');

  const toggle = (value: string) => {
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
    );
  };

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const hasSelection = selected.length > 0;

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
        <div className="border-b border-[hsl(var(--border))] p-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}…`}
            className="flex h-8 w-full rounded-md border border-[hsl(var(--border))] bg-transparent px-2 text-xs shadow-sm outline-none transition-colors placeholder:text-[hsl(var(--text-tertiary))] focus-visible:ring-1 focus-visible:ring-[hsl(var(--ring))]"
          />
        </div>
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
              <div className="px-1 py-3 text-xs text-[hsl(var(--text-tertiary))]">No results found.</div>
            )}
          </div>
        </div>
        {hasSelection && (
          <>
            <Separator />
            <div className="p-1.5">
              <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => onChange([])}>
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
  value: WPTriState;
  onChange: (v: WPTriState) => void;
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

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--text-tertiary))]">
        {label}
      </span>
      {children}
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

export function WrittenProductFilterBar({
  allProducts,
  filters,
  onFiltersChange,
}: WrittenProductFilterBarProps) {
  const optionsByKey = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const f of WP_MULTI_SELECT_FILTERS) {
      result[f.key] = [
        ...new Set(
          allProducts
            .map((p) => p[f.productKey] as string)
            .filter(Boolean),
        ),
      ].sort();
    }
    return result;
  }, [allProducts]);

  const update = <K extends keyof WrittenProductFilters>(key: K, value: WrittenProductFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const activeCount = getWPActiveFilterCount(filters);
  const isActive = activeCount > 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Search input — full width */}
      <div className="relative">
        <Input
          placeholder="Search…"
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="h-8 w-full text-sm pr-7"
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => onFiltersChange({ ...filters, search: '' })}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Sheet trigger */}
      <div className="w-fit">
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
                onClick={() => onFiltersChange(DEFAULT_WP_FILTERS)}
              >
                Clear all
              </Button>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <Accordion
              type="multiple"
              defaultValue={WP_DEFAULT_OPEN_FILTER_SECTIONS}
              className="px-5"
            >
              {WP_FILTER_SECTIONS.map((section) => {
                const multiSelects = WP_MULTI_SELECT_FILTERS.filter((f) => f.section === section);
                const triStates = WP_TRI_STATE_FILTERS.filter((f) => f.section === section);
                const sectionCount = getWPActiveFilterCountForSection(filters, section);
                if (!multiSelects.length && !triStates.length) return null;

                return (
                  <AccordionItem key={section} value={section}>
                    <AccordionTrigger>
                      <span className="flex items-center gap-2">
                        {section}
                        {sectionCount > 0 && (
                          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(var(--accent))] px-1 text-[10px] font-medium text-[hsl(var(--accent-foreground))]">
                            {sectionCount}
                          </span>
                        )}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-col gap-4">
                        {multiSelects.map((f) => (
                          <FilterSection key={f.key} label={f.label}>
                            <MultiSelectPopover
                              label={f.buttonLabel}
                              options={optionsByKey[f.key] ?? []}
                              selected={filters[f.key]}
                              onChange={(v) => update(f.key, v)}
                            />
                          </FilterSection>
                        ))}
                        {triStates.map((f) => (
                          <FilterSection key={f.key} label={f.label}>
                            <TriStateToggle
                              value={filters[f.key]}
                              onChange={(v) => update(f.key, v)}
                            />
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
      </div>

      {/* Active chips — multi-select */}
      {WP_MULTI_SELECT_FILTERS.flatMap((f) =>
        filters[f.key].map((value) => (
          <ActiveChip
            key={`${f.key}-${value}`}
            label={`${f.label}: ${value}`}
            onRemove={() => update(f.key, filters[f.key].filter((v) => v !== value))}
          />
        )),
      )}

      {/* Active chips — tri-state */}
      {WP_TRI_STATE_FILTERS.map((f) =>
        filters[f.key] !== 'all' ? (
          <ActiveChip
            key={f.key}
            label={`${f.chipLabel}: ${filters[f.key] === 'yes' ? 'Yes' : 'No'}`}
            onRemove={() => update(f.key, 'all')}
          />
        ) : null,
      )}

      {isActive && (
        <button
          onClick={() => onFiltersChange(DEFAULT_WP_FILTERS)}
          className="text-xs text-[hsl(var(--text-tertiary))] underline underline-offset-2 hover:text-[hsl(var(--text-primary))] transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
