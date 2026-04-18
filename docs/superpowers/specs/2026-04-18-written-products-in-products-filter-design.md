# Written Products — "In Products" Filter & Status Design

**Date:** 2026-04-18  
**Status:** Approved

## Problem

Written Products (9k+ rows) have no visual indicator of whether they've already been added to the Products catalog (2k+ rows). Users must manually cross-reference the two sheets. There is also no way to filter Written Products by this status, making it hard to find unprocessed items.

## Goals

1. Add a tri-state filter chip ("In Products": All / Yes / No) to the Written Products filter bar.
2. Show an "In Products" badge in the Written Product detail sheet when the product is already in the catalog.
3. Hide the "Add to Products" button in the detail sheet when the product is already present.

## Matching Strategy

A Written Product is considered "in Products" when the title portion of its `textLink` field (text before `||`) matches, case-insensitively, the title portion of any Product's `link` field. This is a title-only match — no country/city/tourType cross-check required.

## Architecture

### Approach: Client-side Set matching via lightweight titles endpoint

Two SWR fetches run in parallel on the Written Products page:
- Existing: `GET /api/written-products` → 9k+ WP rows
- New: `GET /api/products/titles` → array of lowercase product title strings

A `Set<string>` is built client-side from the titles array. `inProducts` is derived on-the-fly per WP: `productTitlesSet.has(parseLinkTitle(wp.textLink))`. No new field is added to the `WrittenProduct` type.

This avoids coupling the two datasets on the server and keeps both API responses independently cacheable.

## Files Changed

| File | Change |
|------|--------|
| `app/api/products/titles/route.ts` | **NEW** — returns `{ titles: string[] }` (lowercase) |
| `lib/written-product-filters.ts` | Add `inProducts: 'all' \| 'yes' \| 'no'` to filter type and defaults |
| `app/(app)/written-products/written-products-client.tsx` | Add SWR fetch for titles, build Set, pass to filter/table/sheet |
| `components/written-products/written-product-filter-bar.tsx` | Add "In Products" tri-state chip |
| `components/written-products/written-product-detail-sheet.tsx` | Add `inProducts` prop, show badge, hide Add button conditionally |

## API Endpoint: `/api/products/titles`

- **Method:** GET
- **Auth:** Requires session (same middleware as all app routes)
- **Data source:** Products sheet via user OAuth token (same as `/api/products`)
- **Response:** `{ titles: string[] }` — lowercase parsed title strings only
- **Caching:** Same 60s dedup window as existing product/WP APIs
- **Payload size:** ~2k short strings, well under 100KB

```ts
// Example response
{ "titles": ["paris day tour", "rome colosseum tour", "amalfi coast trip"] }
```

## Filter Logic

```ts
// lib/written-product-filters.ts
export type WrittenProductFilters = {
  // ... existing fields ...
  inProducts: 'all' | 'yes' | 'no';
};

export const DEFAULT_WP_FILTERS: WrittenProductFilters = {
  // ... existing defaults ...
  inProducts: 'all',
};
```

`applyWPFilters` receives a new optional `productTitlesSet: Set<string>` parameter. When `filters.inProducts !== 'all'`, each WP is checked against the set:

```ts
const title = parseLinkTitle(wp.textLink).toLowerCase();
const matched = productTitlesSet.has(title);
if (filters.inProducts === 'yes' && !matched) return false;
if (filters.inProducts === 'no' && matched) return false;
```

## Client Component Changes (`written-products-client.tsx`)

```ts
const { data: titlesData } = useSWR('/api/products/titles', fetcher);
const productTitlesSet = useMemo(
  () => new Set<string>(titlesData?.titles ?? []),
  [titlesData]
);
```

- `productTitlesSet` passed to `applyWPFilters` for filter logic
- `productTitlesSet` passed to `WrittenProductDetailSheet` as prop
- `productTitlesSet` passed to `WrittenProductTable` as prop (for per-row `inProducts` derivation if a table column badge is needed in future)

## Detail Sheet Changes (`written-product-detail-sheet.tsx`)

New prop: `inProducts: boolean` (computed by parent from `productTitlesSet`).

```tsx
// Badge — shown when inProducts is true
{inProducts && (
  <Badge variant="secondary" className="text-green-700 bg-green-100">
    In Products
  </Badge>
)}

// Add to Products button — hidden when inProducts is true
{!inProducts && (
  <Button onClick={...}>
    <Plus /> Add to Products
  </Button>
)}
```

## Error Handling

- If `/api/products/titles` fails or is loading, `productTitlesSet` defaults to an empty `Set`. All WPs show as "not in products" until the fetch resolves — a safe, non-blocking degradation.
- The "In Products" filter chip is disabled while `titlesData` is undefined (loading state).

## Out of Scope

- Syncing or linking WP and Product records (no ongoing relationship maintained)
- Country/city/tourType cross-validation for matching
- Adding an "In Products" column to the Written Products table
- Automatic removal of WPs when a Product is added
