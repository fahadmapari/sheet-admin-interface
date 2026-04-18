# Written Products — "In Products" Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tri-state "In Products" filter chip to Written Products, and show a badge + hide the "Add to Products" button in the detail sheet when a written product is already in the Products catalog.

**Architecture:** A new lightweight `/api/products/titles` endpoint returns lowercase product title strings. The Written Products client fetches this in parallel with the WP list, builds a `Set<string>`, and derives `inProducts` per WP by checking the title portion of `textLink` against the set. Filter logic and detail sheet UI use this set directly — no changes to the `WrittenProduct` type.

**Tech Stack:** Next.js 16, SWR, TypeScript, shadcn/ui Badge, existing tri-state filter pattern.

---

### Task 1: Create `/api/products/titles` endpoint

**Files:**
- Create: `app/api/products/titles/route.ts`

- [ ] **Step 1: Create the route file**

```ts
// app/api/products/titles/route.ts
import { NextResponse } from 'next/server';
import { fetchAllRows } from '@/lib/sheets';
import { GoogleAccessTokenError, requireGoogleAccessToken } from '@/lib/google-session';
import { parseLinkField } from '@/lib/utils';
import { getEffectiveColumnMap } from '@/lib/column-mapping';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const accessToken = await requireGoogleAccessToken();
    const sheetsAuth = { auth: 'user' as const, accessToken };
    const [colMap, rows] = await Promise.all([
      getEffectiveColumnMap(),
      fetchAllRows(sheetsAuth),
    ]);

    const linkColIndex = colMap['link'];
    const titlesSet = new Set<string>();
    for (const row of rows.slice(1)) {
      const raw = (row[linkColIndex] ?? '').toString().trim();
      if (raw) {
        const title = parseLinkField(raw).text.toLowerCase();
        if (title) titlesSet.add(title);
      }
    }

    return NextResponse.json({ titles: [...titlesSet] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err instanceof GoogleAccessTokenError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 2: Verify the endpoint manually**

Start the dev server (`npm run dev`), sign in, then visit `http://localhost:3000/api/products/titles` in the browser.

Expected response shape:
```json
{ "titles": ["paris day tour", "rome colosseum", "amalfi coast trip", ...] }
```
All strings should be lowercase. Array length should match roughly the number of non-empty products (~2k).

- [ ] **Step 3: Commit**

```bash
git add app/api/products/titles/route.ts
git commit -m "feat: add /api/products/titles endpoint for lightweight title index"
```

---

### Task 2: Extend `WrittenProductFilters` type

**Files:**
- Modify: `lib/written-product-filters.ts`

- [ ] **Step 1: Add `inProducts` to the filter interface and defaults**

In `lib/written-product-filters.ts`, add `inProducts: WPTriState` as the last field of `WrittenProductFilters` (after `ssNotes`):

```ts
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
  inProducts: WPTriState;
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
  inProducts: 'all',
};
```

- [ ] **Step 2: Update `getWPActiveFilterCountForSection` to count `inProducts` in Status section**

Replace the existing `getWPActiveFilterCountForSection` function:

```ts
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
  if (section === 'Status' && filters.inProducts !== 'all') count++;
  return count;
}
```

Note: `getWPActiveFilterCount` already handles `inProducts` automatically because it iterates `Object.values(rest)` and checks `value === 'all'` — no change needed there.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -40
```

Expected: no TypeScript errors related to `WrittenProductFilters`.

- [ ] **Step 4: Commit**

```bash
git add lib/written-product-filters.ts
git commit -m "feat: add inProducts tri-state to WrittenProductFilters"
```

---

### Task 3: Update `written-products-client.tsx`

**Files:**
- Modify: `app/(app)/written-products/written-products-client.tsx`

- [ ] **Step 1: Add SWR call for product titles and build the Set**

After the existing `useSWR` call for `/api/written-products` (line 46), add:

```ts
const { data: titlesData } = useSWR<{ titles: string[] }>(
  '/api/products/titles',
  fetcher,
  { dedupingInterval: 60_000 },
);

const productTitlesSet = useMemo(
  () => new Set<string>(titlesData?.titles ?? []),
  [titlesData],
);
```

- [ ] **Step 2: Add `inProducts` filter logic inside `filteredProducts`**

In the `filteredProducts` useMemo, after the existing `for (const f of WP_TRI_STATE_FILTERS)` loop (before `return true`), add:

```ts
if (filters.inProducts !== 'all') {
  const title = parseLinkField(p.textLink ?? '').text.toLowerCase();
  const matched = productTitlesSet.has(title);
  if (filters.inProducts === 'yes' && !matched) return false;
  if (filters.inProducts === 'no' && matched) return false;
}
```

Also add `productTitlesSet` to the `useMemo` dependency array:

```ts
}, [products, filters, productTitlesSet]);
```

- [ ] **Step 3: Pass `titlesLoading` to `WrittenProductFilterBar`**

Update the `WrittenProductFilterBar` JSX:

```tsx
<WrittenProductFilterBar
  allProducts={products ?? []}
  filters={filters}
  onFiltersChange={setFilters}
  titlesLoading={!titlesData}
/>
```

- [ ] **Step 4: Pass `inProducts` to `WrittenProductDetailSheet`**

Update the `WrittenProductDetailSheet` JSX:

```tsx
<WrittenProductDetailSheet
  product={editProduct}
  inProducts={
    editProduct
      ? productTitlesSet.has(parseLinkField(editProduct.textLink ?? '').text.toLowerCase())
      : false
  }
  onClose={() => setEditProduct(null)}
  onSaved={handleSaved}
  onDelete={(p) => { setEditProduct(null); setDeleteProduct(p); }}
/>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -40
```

Expected: TypeScript errors about `titlesLoading` prop (not yet added to filter bar) and `inProducts` prop (not yet added to detail sheet) — these are expected and will be fixed in later tasks.

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/written-products/written-products-client.tsx
git commit -m "feat: fetch product titles set and wire inProducts filter to written products client"
```

---

### Task 4: Update `WrittenProductFilterBar`

**Files:**
- Modify: `components/written-products/written-product-filter-bar.tsx`

- [ ] **Step 1: Add `titlesLoading` prop to the interface**

Update `WrittenProductFilterBarProps`:

```ts
interface WrittenProductFilterBarProps {
  allProducts: WrittenProduct[];
  filters: WrittenProductFilters;
  onFiltersChange: (filters: WrittenProductFilters) => void;
  titlesLoading?: boolean;
}
```

Update the destructuring in the function signature:

```ts
export function WrittenProductFilterBar({
  allProducts,
  filters,
  onFiltersChange,
  titlesLoading = false,
}: WrittenProductFilterBarProps) {
```

- [ ] **Step 2: Add "In Products" toggle inside the Filters sheet (Status section)**

Inside the `WP_FILTER_SECTIONS.map(...)` block, after `{triStates.map(...)}` and before the closing `</div>` of `AccordionContent`, add the `inProducts` toggle conditionally for the Status section:

```tsx
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
    {section === 'Status' && (
      <FilterSection label="In Products">
        {titlesLoading ? (
          <div className="text-xs text-[hsl(var(--text-tertiary))]">Loading…</div>
        ) : (
          <TriStateToggle
            value={filters.inProducts}
            onChange={(v) => update('inProducts', v)}
          />
        )}
      </FilterSection>
    )}
  </div>
</AccordionContent>
```

- [ ] **Step 3: Add active chip for `inProducts`**

In the active chips row, after `{WP_TRI_STATE_FILTERS.map(...)}` and before the "Clear all" button, add:

```tsx
{filters.inProducts !== 'all' && (
  <ActiveChip
    key="inProducts"
    label={`In Products: ${filters.inProducts === 'yes' ? 'Yes' : 'No'}`}
    onRemove={() => update('inProducts', 'all')}
  />
)}
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```bash
npm run build 2>&1 | head -40
```

Expected: the only remaining TypeScript error should be about `inProducts` prop in `WrittenProductDetailSheet` (fixed next task).

- [ ] **Step 5: Commit**

```bash
git add components/written-products/written-product-filter-bar.tsx
git commit -m "feat: add In Products tri-state filter to WrittenProductFilterBar"
```

---

### Task 5: Update `WrittenProductDetailSheet`

**Files:**
- Modify: `components/written-products/written-product-detail-sheet.tsx`

- [ ] **Step 1: Add `Badge` import**

Add to the existing imports at the top:

```ts
import { Badge } from '@/components/ui/badge';
```

- [ ] **Step 2: Add `inProducts` prop to the interface**

Update `WrittenProductDetailSheetProps`:

```ts
interface WrittenProductDetailSheetProps {
  product: WrittenProduct | null;
  inProducts: boolean;
  onClose: () => void;
  onSaved: (updated: WrittenProduct) => void;
  onDelete: (product: WrittenProduct) => void;
}
```

Update the function signature:

```ts
export function WrittenProductDetailSheet({
  product,
  inProducts,
  onClose,
  onSaved,
  onDelete,
}: WrittenProductDetailSheetProps) {
```

- [ ] **Step 3: Show "In Products" badge in the header**

In the detail view header (the `<div>` containing `<SheetTitle>`), update the title block to add the badge below the title. Replace the existing header `<div>` (lines 97–119) with:

```tsx
<div className="border-b border-[hsl(var(--border))] px-6 py-5">
  <SheetTitle className="text-sm font-medium truncate min-w-0">
    {product?.textLink ? (() => {
      const { text, url } = parseLinkField(product.textLink);
      const displayName = text || url || product.textLink;
      return (
        <span className="inline-flex items-center gap-1.5">
          {displayName}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))] transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </span>
      );
    })() : 'Edit Written Product'}
  </SheetTitle>
  {inProducts && (
    <Badge
      variant="secondary"
      className="mt-1.5 text-xs text-green-700 bg-green-100 border-green-200"
    >
      In Products
    </Badge>
  )}
</div>
```

- [ ] **Step 4: Conditionally hide the "Add to Products" button**

In the footer actions `<div>` (the `flex items-center gap-2` div), wrap the "Add to Products" button with `!inProducts`:

```tsx
<div className="flex items-center gap-2">
  {!inProducts && product && (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 text-xs gap-1"
      onClick={() => setAddProductOpen(true)}
      disabled={isSubmitting}
    >
      <Plus className="h-3.5 w-3.5" />
      Add to Products
    </Button>
  )}
  <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
    Cancel
  </Button>
  <Button type="submit" form={FORM_ID} size="sm" disabled={isSubmitting}>
    {isSubmitting ? 'Saving…' : 'Save'}
  </Button>
</div>
```

- [ ] **Step 5: Verify full build passes**

```bash
npm run build 2>&1 | head -60
```

Expected: no TypeScript errors.

- [ ] **Step 6: Manual smoke test**

With `npm run dev` running:

1. Go to Written Products page — both data fetches should complete (check Network tab: `/api/written-products` and `/api/products/titles`).
2. Open the Filters sheet → Status section → "In Products" toggle should appear with All/Yes/No.
3. Select "In Products: Yes" — table should show only WPs whose title matches a product title. Active chip "In Products: Yes" should appear.
4. Select "In Products: No" — table should show WPs not yet in products. Count should be ~7k+.
5. Click a WP that IS in products — detail sheet should show the green "In Products" badge and NOT show the "Add to Products" button.
6. Click a WP that is NOT in products — detail sheet should NOT show the badge and SHOULD show the "Add to Products" button.
7. Click "Clear all" — filter resets, chips disappear.

- [ ] **Step 7: Commit**

```bash
git add components/written-products/written-product-detail-sheet.tsx
git commit -m "feat: show In Products badge and hide Add button in WrittenProductDetailSheet"
```
