# Edit History & Undo — Design Spec

**Date:** 2026-04-18
**Scope:** Product table + Written Products table

---

## Overview

Add a session-scoped edit history to both the product table and the written products table. Users can view the last 10 edits they made in the current session and revert any of them individually. History clears on page refresh. Only changes made by the current user in the current session are tracked.

---

## Architecture

### `useEditHistory` hook

**Location:** `lib/hooks/use-edit-history.ts`

Encapsulates all history state and revert logic. Each table instantiates its own independent copy of the hook.

```ts
type EditRecord = {
  id: string           // nanoid/uuid for React keying
  rowLabel: string     // product name or written product title (for display)
  fieldLabel: string   // human-readable label (e.g. "Pickup Notes")
  oldValueDisplay: string  // truncated old value for display only
  newValueDisplay: string  // truncated new value for display only
  timestamp: number    // Date.now() at push time
  revertFn: () => Promise<void>  // closure captures all revert context
}
```

The `revertFn` closure is constructed at `push()` time by the caller, encapsulating the correct API call. This keeps the hook API-agnostic:

- **Product table:** closure calls `PATCH /api/products/{rowIndex}` with `{ field, value: oldValue }`
- **Written table:** closure calls `PUT /api/written-products/{rowIndex}` with the full pre-edit `WrittenProduct` snapshot (since that endpoint requires a complete object)

**Exposed API:**

| Member | Description |
|--------|-------------|
| `history: EditRecord[]` | Array of up to 10 records, most recent first |
| `push(record)` | Prepends record, trims array to 10 |
| `revert(record)` | Calls `record.revertFn()`, removes entry on success |

### Product table integration

- Hook instance lives in `products-page-client.tsx`
- `InlineEditCell` captures `oldValue` from row data at edit-start
- `onSaved` callback extended to `onSaved(field, newValue, oldValue)`
- After successful PATCH, parent calls `push()` with the record
- Column display name resolved via existing `useColumnMapping` hook

### Written products table integration

- Hook instance lives in `written-products-client.tsx`
- `written-product-detail-sheet.tsx` receives a new `onFieldSaved(field, oldValue, newValue, snapshot)` prop where `snapshot` is the full pre-edit `WrittenProduct` object
- Detail sheet already has the full product object before saving, so both `oldValue` and `snapshot` are available
- After each field saves successfully, calls `onFieldSaved`
- Parent constructs `revertFn` as a `PUT /api/written-products/{rowIndex}` call using the stored snapshot
- Parent calls `push()` with the complete record

---

## UI

### Toolbar button

- Placed in the existing table toolbar of both tables (next to filters/search)
- Clock/history icon (e.g. `Clock` from lucide-react)
- Small numeric badge showing count of edits in history; hidden when count is 0
- Opens a Popover on click

### Popover

- Width: ~320px
- Header: "Edit History" with a close button
- Body: scrollable list of up to 10 edit entries, most recent first
- Empty state: "No edits this session"

**Each entry displays:**
```
"Row Label" · Field Label
"old value" → "new value"    2m ago    [Revert]
```
- Values truncated to ~30 characters to prevent overflow
- Timestamp shown as relative time (e.g. "2m ago", "just now")
- Revert button: shows a spinner while PATCH is in-flight, disabled during that time
- Entry is removed from list on successful revert

---

## Data Flow

### Edit flow

1. User starts editing a cell → `InlineEditCell` stores `oldValue` from row data
2. User confirms edit → existing PATCH fires to `/api/products/{rowIndex}`
3. On success → `push(record)` called; SWR revalidates table as normal
4. On failure → no history entry added (nothing changed in the sheet)

### Revert flow

1. User clicks Revert on an entry
2. `record.revertFn()` is called (closure constructed at push time):
   - Products: `PATCH /api/products/{rowIndex}` with `{ field, value: oldValue }`
   - Written products: `PUT /api/written-products/{rowIndex}` with full pre-edit snapshot
3. While in-flight → button shows spinner, is disabled
4. On success → entry removed from history; SWR revalidates table data
5. On failure → entry stays in history; toast error shown: "Revert failed, try again"

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Edit PATCH fails | No history entry added |
| Revert PATCH fails | Entry stays; toast error shown |
| Cell edited twice | Both entries appear independently; reverting older one overwrites current value |
| Another user edits same cell between edit and revert | Revert blindly writes old value (same as current inline-edit behaviour) |

---

## Out of Scope

- Persistent history across sessions
- Merging duplicate edits to the same field
- Undo ordering / cascading multi-step undo
- Server-side change log
- Tracking edits made by other users
