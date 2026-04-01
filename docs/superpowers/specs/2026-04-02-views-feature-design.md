# Views Feature Design

**Date:** 2026-04-02  
**Status:** Approved

## Context

The products page currently shows a fixed set of 6 columns in the table (select, product, location, type, status, actions). There is an existing `ColumnVisibilityPanel` component (popover-based) that was built but never wired up to the table. The user wants a more prominent, persistent "Views" concept — a horizontal bar of named presets above the filter bar — replacing the unused popover entirely.

## Goal

Add a Views bar above the filter bar with:
1. A permanent "Default" preset matching current column layout
2. User-created custom views (named, column-selectable, localStorage-persisted)
3. An "Add Custom View" button that opens a dialog for naming and configuring columns

---

## Architecture

### New / Modified Files

| File | Change |
|------|--------|
| `components/products/views-bar.tsx` | **New** — Views bar + Add Custom View dialog |
| `app/products/products-client.tsx` | **Modified** — adds view/columnVisibility state, passes to table, removes ColumnVisibilityPanel |
| `components/products/product-table.tsx` | **Modified** — accepts `columnVisibility` prop, expands to all available columns |
| `components/products/column-visibility.tsx` | **Deleted** — replaced by views-bar |

### State Flow

```
products-client.tsx
  ├── activeViewId: string           ("default" or custom view id)
  ├── customViews: CustomView[]      (loaded from localStorage on mount)
  ├── columnVisibility: VisibilityState  (derived from activeViewId + customViews)
  │
  ├── → ViewsBar (activeViewId, customViews, onViewSelect, onViewDelete, onViewAdd)
  └── → ProductTable (columnVisibility)
```

### localStorage Schema

```ts
// key: "sheet-admin:custom-views"
type CustomView = {
  id: string;       // nanoid or crypto.randomUUID()
  name: string;
  columns: string[]; // field/column ids that are visible
};
```

---

## Components

### ViewsBar (`components/products/views-bar.tsx`)

A single file containing both the bar and the dialog.

**Bar layout:**
```
[ Default ]  [ My Pricing View ×]  [ OTA View ×]  [+ Add Custom View]
```

- Renders above `<FilterBar />` in `products-client.tsx`
- "Default" pill: always first, no delete button, non-removable
- Custom view pills: each has an `×` icon to delete immediately (no confirmation)
- Active view: solid filled styling (distinguishable from inactive)
- Clicking any pill applies that view's column visibility instantly

**Props:**
```ts
interface ViewsBarProps {
  activeViewId: string;
  customViews: CustomView[];
  onViewSelect: (id: string) => void;
  onViewDelete: (id: string) => void;
  onViewAdd: (view: CustomView) => void;
}
```

### Add Custom View Dialog

Opens from the "+ Add Custom View" button. Uses shadcn `Dialog`.

- **Name field**: required text input at the top
- **Column list**: scrollable, grouped by `COLUMN_GROUPS` from `lib/constants.ts`
  - First group: "Default Columns" — the 4 composite columns (Product, Location, Type, Status)
  - Remaining groups: all field groups from `COLUMN_GROUPS`
- **Footer**: Cancel + Save (Save disabled until name filled + ≥1 column checked)
- On Save: appends view to list, saves to localStorage, sets as active view

---

## Column System

### ProductTable Changes

**Before:** 6 hardcoded columns (select, product, location, type, status, actions)

**After:**
- `select` and `actions`: always visible, not part of visibility state
- `product`, `location`, `type`, `status`: composite display columns (visible in Default view)
- All remaining fields from `COLUMN_GROUPS`: individual text columns, hidden by default

TanStack Table's native `columnVisibility` state is used — no custom filtering logic.

`ProductTable` gains:
```ts
columnVisibility?: VisibilityState;
```

### Default View Column Visibility

```ts
const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  product: true,
  location: true,
  type: true,
  status: true,
  // all other columns: false (TanStack default)
};
```

### Column IDs in Custom Views

The column picker in the dialog exposes:
- Composite columns by their display name: `product`, `location`, `type`, `status`
- Individual field columns by their field key from `COLUMN_GROUPS` (e.g. `country`, `city`, `duration`, `price`, etc.)

---

## Data Persistence

Custom views are read from `localStorage` on component mount in `products-client.tsx`. Any add or delete immediately writes the updated array back to `localStorage`.

Key: `sheet-admin:custom-views`  
Value: `JSON.stringify(CustomView[])`

---

## Side Effects

- `ExportButton` in `products-client.tsx` currently receives `columnVisibility={{}}`. After this change it must receive the live `columnVisibility` state so CSV/XLSX exports respect the active view's visible columns.

---

## Verification

1. Load the products page — only "Default" view pill is shown, table looks identical to current
2. Click "+ Add Custom View" — dialog opens with name field and grouped column checkboxes
3. Enter a name, select some columns, click Save — new pill appears, table updates to show selected columns
4. Reload the page — custom view pill persists, clicking it restores column set
5. Click `×` on a custom view — pill disappears, if it was active the view reverts to Default
6. The old "Columns" popover button is gone from the toolbar
