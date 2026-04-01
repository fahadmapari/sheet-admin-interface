# Views Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Views" bar above the filter bar with a permanent Default preset and user-created named custom views that control which table columns are visible, persisted to localStorage.

**Architecture:** A new `ViewsBar` component renders named view pills + an "Add Custom View" dialog. State for `activeViewId`, `customViews`, and derived `columnVisibility` lives in `products-client.tsx`. `ProductTable` is expanded with individual field columns from `COLUMN_GROUPS` and accepts a controlled `columnVisibility` prop via TanStack's native visibility system.

**Tech Stack:** Next.js 14, TanStack Table v8, shadcn/ui (Dialog, Checkbox, ScrollArea, Button, Input), localStorage, `crypto.randomUUID()`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `components/products/views-bar.tsx` | **Create** | ViewsBar pill strip + AddCustomViewDialog |
| `app/products/products-client.tsx` | **Modify** | Add views state, handlers, ViewsBar, pass columnVisibility |
| `components/products/product-table.tsx` | **Modify** | Add columnVisibility prop, add all extra field columns |
| `components/products/column-visibility.tsx` | **Delete** | Replaced by views-bar |

---

## Task 1: Expand ProductTable to accept columnVisibility and render all field columns

**Files:**
- Modify: `components/products/product-table.tsx`

- [ ] **Step 1: Add VisibilityState import and columnVisibility prop**

In `product-table.tsx`, update the TanStack import line (line 3) to include `VisibilityState`:

```ts
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  functionalUpdate,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type VisibilityState,
} from '@tanstack/react-table';
```

Add `COLUMN_GROUPS` and `FIELD_LABELS` imports after the existing constants import (line 17):

```ts
import type { TourProduct } from '@/lib/types';
import { COLUMN_GROUPS, FIELD_LABELS } from '@/lib/constants';
```

- [ ] **Step 2: Add buildExtraColumns function**

Insert this function just before `buildColumns` (before line 35):

```ts
function buildExtraColumns(): ColumnDef<TourProduct>[] {
  return COLUMN_GROUPS.flatMap((group) =>
    (group.fields as readonly string[]).map((fieldId) => ({
      id: fieldId,
      accessorKey: fieldId,
      header: FIELD_LABELS[fieldId as keyof typeof FIELD_LABELS] ?? fieldId,
      cell: ({ row }: { row: import('@tanstack/react-table').Row<TourProduct> }) => {
        const value = row.original[fieldId as keyof TourProduct];
        if (value === null || value === undefined || value === '') {
          return <span className="text-[hsl(var(--text-tertiary))]">–</span>;
        }
        if (typeof value === 'boolean') {
          return <span className="text-xs text-[hsl(var(--text-secondary))]">{value ? 'Yes' : 'No'}</span>;
        }
        return <span className="text-sm text-[hsl(var(--text-primary))] truncate block max-w-[200px]">{String(value)}</span>;
      },
    }))
  );
}
```

- [ ] **Step 3: Insert extra columns into buildColumns (between status and actions)**

In `buildColumns`, replace the closing of the returned array so the extra columns are inserted between `status` and `actions`:

```ts
function buildColumns(
  onDeleteRequest: (product: TourProduct) => void,
  onEditRequest: (product: TourProduct) => void,
): ColumnDef<TourProduct>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 transition-opacity group-hover/row:opacity-100 data-[state=checked]:opacity-100"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'product',
      accessorKey: 'productName',
      header: 'Product',
      cell: ({ row }) => {
        const p = row.original;
        const linkParsed = p.link ? parseLinkField(p.link) : null;
        const linkUrl = linkParsed?.url || null;
        const displayName = p.productName || linkParsed?.text || p.link || `${p.city}, ${p.country}`;
        return (
          <div className="min-w-0 max-w-[280px] flex items-start gap-1">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium leading-tight text-[hsl(var(--text-primary))]">
                {displayName}
              </div>
              {p.duration && (
                <div className="mt-0.5 text-xs text-[hsl(var(--text-secondary))]">{p.duration}</div>
              )}
            </div>
            {linkUrl && (
              <a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5 flex-shrink-0 text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))] transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        );
      },
    },
    {
      id: 'location',
      accessorKey: 'city',
      header: 'Location',
      cell: ({ row }) => (
        <div>
          <div className="text-sm font-medium text-[hsl(var(--text-primary))]">{row.original.city}</div>
          <div className="text-xs text-[hsl(var(--text-secondary))]">{row.original.country}</div>
        </div>
      ),
    },
    {
      id: 'type',
      accessorKey: 'productType',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="default" className="text-xs">
          {row.original.productType}
        </Badge>
      ),
    },
    {
      id: 'status',
      accessorKey: 'productStatus',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.productStatus} />,
    },
    ...buildExtraColumns(),
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <RowActionsMenu
          product={row.original}
          onDeleteRequest={onDeleteRequest}
          onEditRequest={onEditRequest}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
```

- [ ] **Step 4: Add columnVisibility to ProductTableProps and wire into TanStack table**

Update the `ProductTableProps` interface (around line 191):

```ts
interface ProductTableProps {
  data: TourProduct[];
  isLoading: boolean;
  error: unknown;
  rowSelection: RowSelectionState;
  onRowSelectionChange: (updater: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)) => void;
  onDeleteRequest: (product: TourProduct) => void;
  onEditRequest: (product: TourProduct) => void;
  onRowClick: (product: TourProduct) => void;
  columnVisibility?: VisibilityState;
}
```

Update the `ProductTable` function signature to destructure the new prop:

```ts
export function ProductTable({
  data,
  isLoading,
  error,
  rowSelection,
  onRowSelectionChange,
  onDeleteRequest,
  onEditRequest,
  onRowClick,
  columnVisibility = {},
}: ProductTableProps) {
```

Update the `useReactTable` call to include `columnVisibility` in state and a no-op change handler:

```ts
const table = useReactTable({
  data: data ?? [],
  columns,
  state: { sorting, rowSelection, columnVisibility },
  onSortingChange: setSorting,
  onRowSelectionChange: (updater) => {
    onRowSelectionChange(functionalUpdate(updater, rowSelection));
  },
  onColumnVisibilityChange: () => {},
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  enableRowSelection: true,
  enableMultiSort: false,
});
```

- [ ] **Step 5: Verify the table still renders with no errors**

Run the dev server and open the products page. The table should look identical to before (Default view will be applied in Task 3 — for now `columnVisibility={}` means all columns visible, but extra columns are empty/minimal). No TypeScript errors in the file.

---

## Task 2: Create the ViewsBar component and AddCustomViewDialog

**Files:**
- Create: `components/products/views-bar.tsx`

- [ ] **Step 1: Create views-bar.tsx with the full implementation**

Create `components/products/views-bar.tsx` with this complete content:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { COLUMN_GROUPS, FIELD_LABELS } from '@/lib/constants';

export type CustomView = {
  id: string;
  name: string;
  columns: string[];
};

const DISPLAY_COLUMNS = [
  { id: 'product', label: 'Product (Name + Duration)' },
  { id: 'location', label: 'Location (City + Country)' },
  { id: 'type', label: 'Type' },
  { id: 'status', label: 'Status' },
];

interface ViewsBarProps {
  activeViewId: string;
  customViews: CustomView[];
  onViewSelect: (id: string) => void;
  onViewDelete: (id: string) => void;
  onViewAdd: (view: CustomView) => void;
}

export function ViewsBar({
  activeViewId,
  customViews,
  onViewSelect,
  onViewDelete,
  onViewAdd,
}: ViewsBarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        className={cn(
          'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors',
          activeViewId === 'default'
            ? 'bg-[hsl(var(--text-primary))] text-[hsl(var(--background))]'
            : 'border border-[hsl(var(--border))] text-[hsl(var(--text-secondary))] hover:border-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))]',
        )}
        onClick={() => onViewSelect('default')}
      >
        Default
      </button>

      {customViews.map((view) => (
        <span
          key={view.id}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors',
            activeViewId === view.id
              ? 'bg-[hsl(var(--text-primary))] text-[hsl(var(--background))]'
              : 'border border-[hsl(var(--border))] text-[hsl(var(--text-secondary))] hover:border-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))]',
          )}
        >
          <button onClick={() => onViewSelect(view.id)}>{view.name}</button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDelete(view.id);
            }}
            className={cn(
              'ml-0.5 rounded-full transition-opacity',
              activeViewId === view.id ? 'opacity-70 hover:opacity-100' : 'opacity-40 hover:opacity-80',
            )}
            aria-label={`Delete ${view.name} view`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      <Button
        variant="outline"
        size="sm"
        className="h-7 rounded-full text-xs gap-1 px-3"
        onClick={() => setDialogOpen(true)}
      >
        <Plus className="h-3 w-3" />
        Add Custom View
      </Button>

      <AddCustomViewDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={(view) => {
          onViewAdd(view);
          setDialogOpen(false);
        }}
      />
    </div>
  );
}

function AddCustomViewDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (view: CustomView) => void;
}) {
  const [name, setName] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(['product', 'location', 'type', 'status']),
  );

  useEffect(() => {
    if (open) {
      setName('');
      setSelectedColumns(new Set(['product', 'location', 'type', 'status']));
    }
  }, [open]);

  function toggle(id: string) {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSave() {
    onSave({
      id: crypto.randomUUID(),
      name: name.trim(),
      columns: [...selectedColumns],
    });
  }

  const canSave = name.trim().length > 0 && selectedColumns.size > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom View</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="View name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <ScrollArea className="h-72 rounded-md border border-[hsl(var(--border))] p-3">
            <div className="space-y-4">
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--text-tertiary))]">
                  Display Columns
                </p>
                <div className="space-y-1">
                  {DISPLAY_COLUMNS.map((col) => (
                    <label
                      key={col.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-[hsl(var(--surface))]"
                    >
                      <Checkbox
                        checked={selectedColumns.has(col.id)}
                        onCheckedChange={() => toggle(col.id)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-xs text-[hsl(var(--text-secondary))]">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {COLUMN_GROUPS.map((group) => (
                <div key={group.id}>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--text-tertiary))]">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {(group.fields as readonly string[]).map((fieldId) => (
                      <label
                        key={fieldId}
                        className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-[hsl(var(--surface))]"
                      >
                        <Checkbox
                          checked={selectedColumns.has(fieldId)}
                          onCheckedChange={() => toggle(fieldId)}
                          className="h-3.5 w-3.5"
                        />
                        <span className="text-xs text-[hsl(var(--text-secondary))]">
                          {FIELD_LABELS[fieldId as keyof typeof FIELD_LABELS] ?? fieldId}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!canSave}>
            Save View
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors in the new file**

Check that imports resolve: `@/components/ui/dialog`, `@/components/ui/scroll-area`, `@/lib/utils` (for `cn`). These are all already used elsewhere in the project.

---

## Task 3: Wire views state into products-client.tsx

**Files:**
- Modify: `app/products/products-client.tsx`

- [ ] **Step 1: Add new imports at the top of products-client.tsx**

Add to the existing imports block:

```ts
import type { VisibilityState } from '@tanstack/react-table';
import { ViewsBar, type CustomView } from '@/components/products/views-bar';
import { COLUMN_GROUPS } from '@/lib/constants';
```

- [ ] **Step 2: Add views state inside ProductsClient (after the existing useState declarations)**

Insert after the `selectedProduct` state (around line 42):

```ts
const [activeViewId, setActiveViewId] = useState<string>('default');
const [customViews, setCustomViews] = useState<CustomView[]>(() => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('sheet-admin:custom-views');
    return stored ? (JSON.parse(stored) as CustomView[]) : [];
  } catch {
    return [];
  }
});
```

- [ ] **Step 3: Add columnVisibility derived state (after filteredProducts/searchedProducts useMemos)**

Insert after the `selectedProducts` useMemo:

```ts
const ALL_FIELD_IDS = COLUMN_GROUPS.flatMap((g) => g.fields as readonly string[]);

const columnVisibility = useMemo((): VisibilityState => {
  const base: VisibilityState = Object.fromEntries(ALL_FIELD_IDS.map((id) => [id, false]));

  if (activeViewId === 'default') {
    return { ...base, product: true, location: true, type: true, status: true };
  }

  const view = customViews.find((v) => v.id === activeViewId);
  if (!view) {
    return { ...base, product: true, location: true, type: true, status: true };
  }

  const cols = new Set(view.columns);
  return {
    ...base,
    product: cols.has('product'),
    location: cols.has('location'),
    type: cols.has('type'),
    status: cols.has('status'),
    ...Object.fromEntries(ALL_FIELD_IDS.map((id) => [id, cols.has(id)])),
  };
}, [activeViewId, customViews, ALL_FIELD_IDS]);
```

- [ ] **Step 4: Add view handlers (after the columnVisibility useMemo)**

```ts
function handleViewAdd(view: CustomView) {
  const next = [...customViews, view];
  setCustomViews(next);
  localStorage.setItem('sheet-admin:custom-views', JSON.stringify(next));
  setActiveViewId(view.id);
}

function handleViewDelete(id: string) {
  const next = customViews.filter((v) => v.id !== id);
  setCustomViews(next);
  localStorage.setItem('sheet-admin:custom-views', JSON.stringify(next));
  if (activeViewId === id) setActiveViewId('default');
}
```

- [ ] **Step 5: Add ViewsBar above FilterBar in the JSX**

Replace the existing `<FilterBar ... />` line with:

```tsx
<ViewsBar
  activeViewId={activeViewId}
  customViews={customViews}
  onViewSelect={setActiveViewId}
  onViewDelete={handleViewDelete}
  onViewAdd={handleViewAdd}
/>
<FilterBar filters={filters} onFiltersChange={setFilters} />
```

- [ ] **Step 6: Pass columnVisibility to ProductTable**

Update the `<ProductTable>` JSX (around line 214) to include the new prop:

```tsx
<ProductTable
  data={searchedProducts}
  isLoading={isLoading}
  error={error}
  rowSelection={rowSelection}
  onRowSelectionChange={setRowSelection}
  onDeleteRequest={(product) => setDeleteTarget(product)}
  onEditRequest={(product) => setSelectedProduct(product)}
  onRowClick={(product) => setSelectedProduct(product)}
  columnVisibility={columnVisibility}
/>
```

- [ ] **Step 7: Pass live columnVisibility to ExportButton**

Update the `<ExportButton>` line from `columnVisibility={{}}` to:

```tsx
<ExportButton products={searchedProducts} columnVisibility={columnVisibility} />
```

- [ ] **Step 8: Fix the ALL_FIELD_IDS dependency in useMemo**

The `ALL_FIELD_IDS` array is computed inline inside the component, which will recreate it on every render. Move it outside the component (module level), just before the `ProductsClient` function:

```ts
const ALL_FIELD_IDS = COLUMN_GROUPS.flatMap((g) => g.fields as readonly string[]);
```

Then remove it from inside the component body and remove it from the useMemo dependency array (replace with nothing, since it's now a module-level constant):

```ts
const columnVisibility = useMemo((): VisibilityState => {
  const base: VisibilityState = Object.fromEntries(ALL_FIELD_IDS.map((id) => [id, false]));

  if (activeViewId === 'default') {
    return { ...base, product: true, location: true, type: true, status: true };
  }

  const view = customViews.find((v) => v.id === activeViewId);
  if (!view) {
    return { ...base, product: true, location: true, type: true, status: true };
  }

  const cols = new Set(view.columns);
  return {
    ...base,
    product: cols.has('product'),
    location: cols.has('location'),
    type: cols.has('type'),
    status: cols.has('status'),
    ...Object.fromEntries(ALL_FIELD_IDS.map((id) => [id, cols.has(id)])),
  };
}, [activeViewId, customViews]);
```

---

## Task 4: Delete the old column-visibility.tsx

**Files:**
- Delete: `components/products/column-visibility.tsx`

- [ ] **Step 1: Confirm no imports of ColumnVisibilityPanel exist**

Run a search to confirm nothing imports from column-visibility.tsx:

```bash
grep -r "column-visibility" e:/projects/sheet-admin/components e:/projects/sheet-admin/app --include="*.tsx" --include="*.ts"
```

Expected: No results (the file was never imported into products-client.tsx).

- [ ] **Step 2: Delete the file**

```bash
rm e:/projects/sheet-admin/components/products/column-visibility.tsx
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Views bar with Default preset and custom views

- ViewsBar pill strip renders above FilterBar
- AddCustomViewDialog for naming and configuring column sets
- Custom views persisted to localStorage (sheet-admin:custom-views)  
- ProductTable expanded with all COLUMN_GROUPS field columns
- columnVisibility state derived from active view and passed to table
- ExportButton now receives live columnVisibility
- Removed unused ColumnVisibilityPanel (column-visibility.tsx)"
```

---

## Verification

1. Load `/products` — table shows identical to before: Product, Location, Type, Status columns only. "Default" pill is active (filled).
2. Click "+ Add Custom View" — dialog opens with a name field and grouped column checkboxes. "Display Columns" group and all COLUMN_GROUPS are listed.
3. Type a name (e.g. "Pricing"), check some selling price columns, click "Save View" — new "Pricing" pill appears active, table now shows those columns.
4. Reload the page — "Pricing" pill is still there. Click it — table updates to show those columns. Click "Default" — table reverts.
5. Click `×` on the "Pricing" pill — it disappears, view reverts to Default.
6. Open dev tools → Application → localStorage → confirm `sheet-admin:custom-views` key is written/updated correctly.
7. Check the ExportButton: with a custom view active, CSV export should only include visible columns.
