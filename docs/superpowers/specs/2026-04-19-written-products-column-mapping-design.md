# Written Products Column Mapping — Design Spec

**Date:** 2026-04-19  
**Status:** Approved

## Overview

Add a column mapping feature for Written Products that mirrors the existing tour-products column mapping. Admins can remap any written product field to any sheet column letter. Settings are surfaced as a "Written Products" sub-tab inside the existing "Column Mapping" settings tab.

---

## Architecture

### Approach

Full parity with the tour-product column mapping. Each concern gets its own file; the only shared infrastructure is MongoDB (different collection) and the column-utils helpers.

### New Files

| File | Purpose |
|---|---|
| `lib/written-column-mapping.ts` | Backend logic: defaults, effective map, save/clear overrides |
| `app/api/written-column-mapping/route.ts` | GET / PUT / DELETE API route |
| `lib/hooks/use-written-column-mapping.ts` | SWR client hook |
| `components/settings/written-column-mapping-settings.tsx` | Settings UI component |

### Modified Files

| File | Change |
|---|---|
| `lib/written-products-utils.ts` | `rowToWrittenProduct()` and `writtenProductToRow()` accept a `colMap` argument instead of hardcoded indices |
| `app/api/written-products/route.ts` | Call `getEffectiveWrittenColumnMap()`, pass map to utils |
| `app/api/written-products/[rowIndex]/route.ts` | Same as above |
| `components/settings/column-mapping-settings.tsx` | Wrap existing content in "Products" sub-tab; add "Written Products" sub-tab |

### MongoDB

- **Collection:** `writtencolumnmapping`
- **Document shape:** `{ overrides: Record<string, number> }` (field name → 0-based column index)
- Same upsert / diff-vs-defaults pattern as `columnmapping` collection

---

## Data Model

### Written Product Defaults (`WRITTEN_FIELD_TO_COL`)

13 fields, default columns A–M (indices 0–12):

| Field | Default Column | Index |
|---|---|---|
| `country` | A | 0 |
| `cityDestination` | B | 1 |
| `state` | C | 2 |
| `tourType` | D | 3 |
| `textLink` | E | 4 |
| `ccOk` | F | 5 |
| `isOk` | G | 6 |
| `rrOk` | H | 7 |
| `ssOk` | I | 8 |
| `contentExist` | J | 9 |
| `b2b` | K | 10 |
| `b2c` | L | 11 |
| `ssNotes` | M | 12 |

### Field Labels (`WRITTEN_FIELD_LABELS`)

Used in the settings table UI:

```ts
{
  country: "Country",
  cityDestination: "City Destination",
  state: "State",
  tourType: "Tour Type",
  textLink: "Text Link",
  ccOk: "CC OK",
  isOk: "IS OK",
  rrOk: "RR OK",
  ssOk: "SS OK",
  contentExist: "Content Exist",
  b2b: "B2B",
  b2c: "B2C",
  ssNotes: "SS Notes",
}
```

### Column Letter Validation

Same as tour products: A–BR (indices 0–69). No artificial restriction to A–M.

---

## Backend

### `lib/written-column-mapping.ts`

Exports:
- `WRITTEN_FIELD_TO_COL: Record<string, number>` — hardcoded defaults
- `getEffectiveWrittenColumnMap(): Promise<Record<string, number>>` — merges defaults with MongoDB overrides
- `saveWrittenColumnMappingOverrides(overrides: Record<string, number>): Promise<void>` — diffs vs defaults, upserts to MongoDB
- `clearWrittenColumnMappingOverrides(): Promise<void>` — deletes all overrides

### `app/api/written-column-mapping/route.ts`

- `GET` — returns `ColumnMappingEntry[]` (field, label, currentLetter, defaultLetter, sheetHeader, isOverride)
- `PUT` — validates and saves overrides; admin-only
- `DELETE` — clears all overrides; admin-only

Validation (same rules as tour products):
- Column letter must match `/^[A-Z]{1,2}$/`
- Index must be in range 0–69
- No duplicate column assignments

### `lib/hooks/use-written-column-mapping.ts`

SWR hook fetching from `/api/written-column-mapping`. Same interface as `use-column-mapping.ts`.

---

## Written Products Integration

### Signature Change

```ts
// Before
rowToWrittenProduct(row: string[], rowIndex: number): WrittenProduct
writtenProductToRow(product: WrittenProduct): string[]

// After
rowToWrittenProduct(row: string[], rowIndex: number, colMap: Record<string, number>): WrittenProduct
writtenProductToRow(product: WrittenProduct, colMap: Record<string, number>): string[]
```

Each API route handler calls `getEffectiveWrittenColumnMap()` once per request and passes the result to these functions. No additional caching beyond MongoDB connection pooling.

---

## Frontend

### Settings Tab Structure

```
Column Mapping (existing settings tab)
├── Products          ← existing ColumnMappingSettings, unchanged
└── Written Products  ← new WrittenColumnMappingSettings
```

Sub-tabs use the shadcn `Tabs` primitive. Default active: "Products" (preserves current behavior).

### `written-column-mapping-settings.tsx`

Near-exact copy of `column-mapping-settings.tsx` with:
- 13 rows (one per written product field)
- Fetches from `/api/written-column-mapping`
- Field labels from `WRITTEN_FIELD_LABELS`
- Same draft state, per-field reset, "Reset all to defaults", modified badge, and validation UX

---

## Error Handling

- Validation errors shown inline per field (same pattern as tour products)
- Toast notifications for save success / failure
- Admin-only access enforced at API level (401/403)

---

## Out of Scope

- Column groups for written products (not requested)
- Written products sheet header display in settings (the settings table will show the field label in place of a sheet header — no separate sheet header fetch from the written products spreadsheet)
