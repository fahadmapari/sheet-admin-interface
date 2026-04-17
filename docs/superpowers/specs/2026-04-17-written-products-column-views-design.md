# Written Products Column Views — Design Spec

**Date:** 2026-04-17

## Goal

Mirror the column viewing feature from the products table to the written products table, allowing users to create named custom views that show/hide columns.

## Columns

| Group | Column ID | Label |
|---|---|---|
| Main | textLink | Text Link |
| Main | country | Country |
| Main | cityDestination | City / Destination |
| Main | state | State |
| Main | tourType | Tour Type |
| Status | ccOk | CC OK |
| Status | isOk | IS OK |
| Status | rrOk | RR OK |
| Status | ssOk | SS OK |
| Status | contentExist | Content |
| Status | b2b | B2B |
| Status | b2c | B2C |
| Status | ssNotes | SS Notes |

## Architecture

### New component: `WrittenViewsBar`

Located at `components/written-products/written-views-bar.tsx`.

Mirrors `components/products/views-bar.tsx` in structure:
- Pill-style tab strip: "Default" + custom views + "Add Custom View" button
- `AddWrittenCustomViewDialog` — dialog with view name input and checkbox list for all written product columns (split into "Main Columns" and "Status Columns" groups)
- Exports `CustomView` type (same shape: `{ id, name, columns: string[] }`)

### Default view

All columns visible (`columnVisibility` = all `true`). This differs from the products default (which hides extra columns) because written products has no API-driven extra columns — all are first-class.

### State in `WrittenProductsClient`

- `activeViewId: string` — initialized to `"default"`
- `customViews: CustomView[]` — loaded from `localStorage` key `sheet-admin:written-custom-views` on mount
- `columnVisibility: VisibilityState` — computed from `activeViewId` + `customViews`
- Handlers: `handleViewAdd`, `handleViewDelete` (same pattern as products client)

### Updated `WrittenProductTable`

- Gains prop `columnVisibility?: VisibilityState` (defaults to `{}`)
- Passes it into `useReactTable` state

## Data Flow

```
WrittenProductsClient
  ├─ activeViewId + customViews state
  ├─ columnVisibility (derived)
  ├─ WrittenViewsBar (renders view pills, emits view add/delete/select)
  └─ WrittenProductTable (receives columnVisibility)
```

## Persistence

Custom views stored in `localStorage` under `sheet-admin:written-custom-views` as JSON array of `CustomView`.

## What is NOT changing

- The products table / `ViewsBar` — untouched
- The `useColumnGroups` hook — not used for written products (written columns are static)
- Export button — not wired to column visibility (out of scope)
