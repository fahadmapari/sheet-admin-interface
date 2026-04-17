# Written Products Filter Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add filters for all WrittenProduct columns (multi-select for strings, tri-state for booleans) and move the filter UI into a Sheet sidebar matching the products page pattern, while keeping search inline.

**Architecture:** Extract filter types/configs/helpers into a new `lib/written-product-filters.ts` (mirrors `lib/product-filters.ts`). Rewrite `written-product-filter-bar.tsx` to use a Sheet with Accordion sections and inline active chips. Expand the filter memo in `written-products-client.tsx` to cover all 12 filterable fields.

**Tech Stack:** Next.js 16, React, shadcn/ui (Sheet, Accordion, Popover, Checkbox), TypeScript, SWR

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `lib/written-product-filters.ts` | Filter types, defaults, section configs, count helpers |
| Rewrite | `components/written-products/written-product-filter-bar.tsx` | Sheet-based filter UI with inline search + active chips |
| Modify | `app/(app)/written-products/written-products-client.tsx` | Import from new lib; expand filteredProducts memo |

---

### Task 1: Create `lib/written-product-filters.ts`

**Files:**
- Create: `lib/written-product-filters.ts`

- [ ] **Step 1: Create the filter types, defaults, and configs**

Create `lib/written-product-filters.ts` with this exact content:

```typescript
import type { WrittenProduct } from './types';

export type WPTriState = 'all' | 'yes' | 'no';

export interface WrittenProductFilters {
  search: string;
  countries: string[];
  states: string[];
  cities: string[];
  tourTypes: string[];
  ccOk: WPTriState;
  isOk: WPTriState;
  rrOk: WPTriState;
  ssOk: WPTriState;
  contentExist: WPTriState;
  b2b: WPTriState;
  b2c: WPTriState;
  ssNotes: WPTriState;
}

export const DEFAULT_WP_FILTERS: WrittenProductFilters = {
  search: '',
  countries: [],
  states: [],
  cities: [],
  tourTypes: [],
  ccOk: 'all',
  isOk: 'all',
  rrOk: 'all',
  ssOk: 'all',
  contentExist: 'all',
  b2b: 'all',
  b2c: 'all',
  ssNotes: 'all',
};

export const WP_FILTER_SECTIONS = ['Location', 'Status'] as const;
export type WPFilterSection = (typeof WP_FILTER_SECTIONS)[number];

export type WPMultiSelectKey = 'countries' | 'states' | 'cities' | 'tourTypes';
export type WPTriStateKey = 'ccOk' | 'isOk' | 'rrOk' | 'ssOk' | 'contentExist' | 'b2b' | 'b2c' | 'ssNotes';

export const WP_MULTI_SELECT_FILTERS: Array<{
  key: WPMultiSelectKey;
  productKey: keyof WrittenProduct;
  label: string;
  buttonLabel: string;
  section: WPFilterSection;
}> = [
  { key: 'countries', productKey: 'country', label: 'Country', buttonLabel: 'Select countries', section: 'Location' },
  { key: 'states', productKey: 'state', label: 'State', buttonLabel: 'Select states', section: 'Location' },
  { key: 'cities', productKey: 'cityDestination', label: 'City / Destination', buttonLabel: 'Select cities', section: 'Location' },
  { key: 'tourTypes', productKey: 'tourType', label: 'Tour Type', buttonLabel: 'Select tour types', section: 'Location' },
];

export const WP_TRI_STATE_FILTERS: Array<{
  key: WPTriStateKey;
  productKey: keyof WrittenProduct;
  label: string;
  chipLabel: string;
  section: WPFilterSection;
}> = [
  { key: 'ccOk', productKey: 'ccOk', label: 'CC OK', chipLabel: 'CC OK', section: 'Status' },
  { key: 'isOk', productKey: 'isOk', label: 'IS OK', chipLabel: 'IS OK', section: 'Status' },
  { key: 'rrOk', productKey: 'rrOk', label: 'RR OK', chipLabel: 'RR OK', section: 'Status' },
  { key: 'ssOk', productKey: 'ssOk', label: 'SS OK', chipLabel: 'SS OK', section: 'Status' },
  { key: 'contentExist', productKey: 'contentExist', label: 'Content Exist', chipLabel: 'Content Exist', section: 'Status' },
  { key: 'b2b', productKey: 'b2b', label: 'B2B', chipLabel: 'B2B', section: 'Status' },
  { key: 'b2c', productKey: 'b2c', label: 'B2C', chipLabel: 'B2C', section: 'Status' },
  { key: 'ssNotes', productKey: 'ssNotes', label: 'SS Notes', chipLabel: 'SS Notes', section: 'Status' },
];

export function getWPActiveFilterCount(filters: WrittenProductFilters): number {
  let count = 0;
  for (const f of WP_MULTI_SELECT_FILTERS) count += filters[f.key].length;
  for (const f of WP_TRI_STATE_FILTERS) { if (filters[f.key] !== 'all') count++; }
  return count;
}

export function getWPActiveFilterCountForSection(
  filters: WrittenProductFilters,
  section: WPFilterSection,
): number {
  let count = 0;
  for (const f of WP_MULTI_SELECT_FILTERS) {
    if (f.section === section) count += filters[f.key].length;
  }
  for (const f of WP_TRI_STATE_FILTERS) {
    if (f.section === section && filters[f.key] !== 'all') count++;
  }
  return count;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build 2>&1 | head -30`

Expected: no errors (or only pre-existing errors unrelated to this file).

- [ ] **Step 3: Commit**

```bash
git add lib/written-product-filters.ts
git commit -m "feat: add written-product-filters lib with types, configs, and helpers"
```

---

### Task 2: Rewrite `written-product-filter-bar.tsx`

**Files:**
- Modify: `components/written-products/written-product-filter-bar.tsx`

- [ ] **Step 1: Replace the file with the new Sheet-based implementation**

Replace the entire contents of `components/written-products/written-product-filter-bar.tsx`:

```typescript
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
  WP_MULTI_SELECT_FILTERS,
  WP_TRI_STATE_FILTERS,
  getWPActiveFilterCount,
  getWPActiveFilterCountForSection,
  type WPTriState,
  type WrittenProductFilters,
} from '@/lib/written-product-filters';

export type { WrittenProductFilters };
export { DEFAULT_WP_FILTERS };

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
    <div className="flex flex-wrap items-center gap-2">
      {/* Search input — stays inline */}
      <div className="relative">
        <Input
          placeholder="Search…"
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="h-8 w-52 text-sm pr-7"
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
              defaultValue={[...WP_FILTER_SECTIONS]}
              className="px-5"
            >
              {WP_FILTER_SECTIONS.map((section) => {
                const multiSelects = WP_MULTI_SELECT_FILTERS.filter((f) => f.section === section);
                const triStates = WP_TRI_STATE_FILTERS.filter((f) => f.section === section);
                const sectionCount = getWPActiveFilterCountForSection(filters, section);

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
```

- [ ] **Step 2: Verify build compiles cleanly**

Run: `npm run build 2>&1 | head -40`

Expected: no new TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add components/written-products/written-product-filter-bar.tsx
git commit -m "feat: rewrite written product filter bar with Sheet and full column filters"
```

---

### Task 3: Expand filter logic in `written-products-client.tsx`

**Files:**
- Modify: `app/(app)/written-products/written-products-client.tsx`

- [ ] **Step 1: Update imports**

In `app/(app)/written-products/written-products-client.tsx`, replace the import block that pulls from `written-product-filter-bar`:

```typescript
// BEFORE
import {
  WrittenProductFilterBar,
  DEFAULT_WP_FILTERS,
  type WrittenProductFilters,
} from '@/components/written-products/written-product-filter-bar';
```

```typescript
// AFTER
import {
  WrittenProductFilterBar,
} from '@/components/written-products/written-product-filter-bar';
import {
  DEFAULT_WP_FILTERS,
  WP_MULTI_SELECT_FILTERS,
  WP_TRI_STATE_FILTERS,
  type WrittenProductFilters,
} from '@/lib/written-product-filters';
```

- [ ] **Step 2: Replace the `filteredProducts` memo**

Find the `filteredProducts` useMemo in the same file (currently around line 82) and replace it:

```typescript
// BEFORE
const filteredProducts = useMemo(() => {
  if (!products) return [];
  const search = filters.search.toLowerCase();
  return products.filter((p) => {
    if (filters.countries.length > 0 && !filters.countries.includes(p.country)) return false;
    if (filters.tourTypes.length > 0 && !filters.tourTypes.includes(p.tourType)) return false;
    if (
      search &&
      ![p.textLink, p.country, p.cityDestination].some((v) =>
        v?.toLowerCase().includes(search),
      )
    )
      return false;
    return true;
  });
}, [products, filters]);
```

```typescript
// AFTER
const filteredProducts = useMemo(() => {
  if (!products) return [];
  const search = filters.search.toLowerCase();
  return products.filter((p) => {
    if (
      search &&
      ![p.textLink, p.country, p.cityDestination].some((v) =>
        v?.toLowerCase().includes(search),
      )
    )
      return false;
    for (const f of WP_MULTI_SELECT_FILTERS) {
      const selected = filters[f.key];
      if (selected.length > 0 && !selected.includes(p[f.productKey] as string)) return false;
    }
    for (const f of WP_TRI_STATE_FILTERS) {
      const state = filters[f.key];
      if (state === 'all') continue;
      const val = Boolean(p[f.productKey]);
      if (state === 'yes' && !val) return false;
      if (state === 'no' && val) return false;
    }
    return true;
  });
}, [products, filters]);
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | head -40`

Expected: clean build with no new errors.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/written-products/written-products-client.tsx
git commit -m "feat: expand written products filter logic to cover all columns"
```

---

### Task 4: Manual Smoke Test

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

Navigate to `http://localhost:3000/written-products`

- [ ] **Step 2: Verify Sheet opens**

Click the "Filters" button. The Sheet should slide in from the right with two accordion sections: "Location" and "Status". Both should be open by default.

- [ ] **Step 3: Verify multi-select filters work**

In "Location", open the Country popover. Select one country. Verify:
- The popover button shows a count badge
- An active chip appears inline in the filter bar (e.g. `Country: France`)
- The table rows are filtered to only show that country
- Clicking X on the chip removes the filter

- [ ] **Step 4: Verify tri-state filters work**

In "Status", click "Yes" on CC OK. Verify:
- An active chip appears: `CC OK: Yes`
- The table shows only rows where ccOk is true
- Clicking "All" in the toggle or X on the chip resets it

- [ ] **Step 5: Verify "Clear all" works**

Apply multiple filters, then click "Clear all" in the sheet header or the link below the chips. All filters should reset and all rows should reappear.

- [ ] **Step 6: Verify search still works**

Type in the search box. The table should filter by textLink, country, and cityDestination as before, independently of the Sheet filters.

- [ ] **Step 7: Verify section count badges**

With filters active in a section, the accordion trigger should show a count badge next to the section name.
