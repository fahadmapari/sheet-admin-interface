# Column Mapping Editor — Design Spec

**Date:** 2026-04-11  
**Status:** Approved

## Problem

The app's column mapping (which sheet column letter maps to which product field) is hardcoded in `lib/constants.ts` (`COLUMN_MAP`) and repeated as hardcoded indices throughout `lib/utils.ts` (`rowToProduct`, `productToRow`). If someone inserts or removes a column in the Google Sheet, all downstream reads and writes break silently. Admins have no way to fix this without a code deployment.

## Goal

Add a **Column Mapping** tab to the Settings page (admin-only) that:
1. Shows the full mapping: app field → column letter → sheet header name.
2. Allows admins to reassign column letters per field.
3. Persists overrides in MongoDB; the app immediately uses the new mapping for all reads and writes.
4. Falls back to hardcoded defaults if MongoDB is unavailable or no overrides exist.

---

## Architecture

### Approach: Override-only persistence (Option C)

- Hardcoded `COLUMN_MAP` in `lib/constants.ts` remains the source of truth for defaults.
- MongoDB stores only the *changed* entries (overrides).
- At runtime, `getEffectiveColumnMap()` merges: `{ ...COLUMN_MAP, ...overrides }`.
- If the collection is missing or empty, the result equals `COLUMN_MAP` — no regression.

---

## Data Model

**MongoDB collection:** `columnmapping`  
**Single document schema:**

```json
{
  "overrides": {
    "country": 1,
    "imageLinks": 14
  }
}
```

- Keys are `keyof Omit<TourProduct, 'rowIndex'>` (field names).
- Values are 0-based column indices (0 = A, 69 = BR).
- Only fields that differ from the hardcoded default are stored.

---

## New Module: `lib/column-mapping.ts`

```ts
// Returns effective mapping: defaults merged with MongoDB overrides.
// Falls back to COLUMN_MAP if DB is unavailable.
export async function getEffectiveColumnMap(): Promise<Record<string, number>>

// Saves only the changed entries (vs COLUMN_MAP defaults) to MongoDB.
export async function saveColumnMappingOverrides(overrides: Record<string, number>): Promise<void>

// Clears all overrides from MongoDB.
export async function clearColumnMappingOverrides(): Promise<void>
```

Move `colIndexToLetter` from `lib/sheets.ts` (currently private) to `lib/column-mapping.ts` as a shared export. Add the inverse `colLetterToIndex(letter: string): number`.

---

## API Endpoints

All three endpoints require an active admin session (checked via `getAccessControl()`).

### `GET /api/column-mapping`

Returns an array of mapping entries for the UI:

```ts
type ColumnMappingEntry = {
  field: string;         // e.g. "country"
  fieldLabel: string;    // e.g. "Country"  (from FIELD_LABELS)
  colIndex: number;      // 0-based
  colLetter: string;     // e.g. "A"
  sheetHeader: string;   // e.g. "Country"  (from COLUMN_HEADERS)
  isOverridden: boolean; // true if differs from COLUMN_MAP default
};
```

### `PUT /api/column-mapping`

Body: `{ overrides: Record<string, number> }`

Validation:
- All field names must be valid `TourProduct` fields (excluding `rowIndex`).
- All col indices must be 0–69.
- No two fields may share the same col index.

Saves overrides to MongoDB. Returns `{ ok: true }`.

### `DELETE /api/column-mapping`

Clears the overrides document. Returns `{ ok: true }`.

---

## `lib/utils.ts` Changes

`rowToProduct` and `productToRow` gain an optional `colMap` parameter:

```ts
export function rowToProduct(
  row: string[],
  rowIndex: number,
  linkHyperlink?: string,
  imageLinksRichText?: string,
  colMap: Record<string, number> = COLUMN_MAP,
): TourProduct

export function productToRow(
  product: Omit<TourProduct, 'rowIndex'>,
  colMap: Record<string, number> = COLUMN_MAP,
): string[]
```

All hardcoded indices (e.g. `get(0)`, `set(5, ...)`) are replaced with `get(colMap['country'])`, `set(colMap['link'], ...)` etc.

Callers that don't pass `colMap` continue working unchanged (defaults to `COLUMN_MAP`).

---

## Product API Route Changes

`/api/products/route.ts` and `/api/products/[rowIndex]/route.ts`:

1. Call `const colMap = await getEffectiveColumnMap()` at the start of each handler.
2. Pass `colMap` to all `rowToProduct` and `productToRow` calls.
3. Replace hardcoded `LINK_COL_INDEX = 5` and `IMAGE_LINKS_COL_INDEX = 13` with:
   ```ts
   const linkColIndex = colMap['link'];
   const imageLinksColIndex = colMap['imageLinks'];
   ```

---

## Settings UI

### Tab placement

New **"Column Mapping"** tab added to `app/(app)/settings/page.tsx`, admin-only (same condition as Access and Column Groups tabs).

### Component: `components/settings/column-mapping-settings.tsx`

Client component. Fetches from `GET /api/column-mapping` via SWR.

**Table layout (one row per field, 70 rows total):**

| App Field | Col Letter | Sheet Header | |
|---|---|---|---|
| Country | `A` (input) | Country | — |
| imageLinks | `N` (input, modified badge) | Image links | ↺ reset icon |

- **Col Letter input:** 1–2 char text input, auto-uppercased. Editing marks the row dirty.
- **Modified badge:** shown when the current value differs from the hardcoded default.
- **Per-row reset icon:** clears that field's override, reverting to default letter.
- **Toolbar (appears when dirty):** Save, Discard buttons.
- **"Reset all to defaults" button:** shown when any override exists (not dirty). Calls `DELETE /api/column-mapping`.

### Validation (on Save)

- Each letter must match `/^[A-Z]{1,2}$/` and resolve to a valid index (0–69).
- No duplicate letters across fields.
- Errors shown inline below the input for the offending row.
- Save is blocked until all errors are resolved.

### Data hook: `lib/hooks/use-column-mapping.ts`

SWR hook over `GET /api/column-mapping`. Exports `{ entries, isLoading, isError, mutate }`.

---

## Out of Scope

- Per-user mapping (mapping is global, shared across all users).
- Live preview of how a mapping change would affect a specific row before saving.
- Auto-detection of column shifts by reading the live sheet header row.
