# Written Products Column Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `ViewsBar`-style column visibility feature to the written products table so users can create, save, and switch between named column views.

**Architecture:** A new `WrittenViewsBar` component (mirrors `ViewsBar` but with hardcoded written-product columns) is rendered in `WrittenProductsClient`, which manages `activeViewId` + `customViews` state persisted to localStorage. A `columnVisibility` map is derived from the active view and passed down to `WrittenProductTable`, which now forwards it to `useReactTable`.

**Tech Stack:** React, TanStack Table (`@tanstack/react-table` `VisibilityState`), shadcn/ui (Dialog, Button, Checkbox, ScrollArea, Input), localStorage for persistence.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `components/written-products/written-product-table.tsx` | Accept + forward `columnVisibility` prop |
| Create | `components/written-products/written-views-bar.tsx` | View pills + "Add Custom View" dialog for written product columns |
| Modify | `app/(app)/written-products/written-products-client.tsx` | Manage view state, compute `columnVisibility`, render `WrittenViewsBar` |

---

## Task 1: Accept `columnVisibility` in `WrittenProductTable`

**Files:**
- Modify: `components/written-products/written-product-table.tsx`

- [ ] **Step 1: Add `VisibilityState` to imports and update the props interface**

In `components/written-products/written-product-table.tsx`, change the import on line 6 from:
```tsx
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table';
```
to:
```tsx
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type Row,
  type VisibilityState,
} from '@tanstack/react-table';
```

And change the `WrittenProductTableProps` interface from:
```tsx
interface WrittenProductTableProps {
  products: WrittenProduct[];
  onEdit: (product: WrittenProduct) => void;
}
```
to:
```tsx
interface WrittenProductTableProps {
  products: WrittenProduct[];
  onEdit: (product: WrittenProduct) => void;
  columnVisibility?: VisibilityState;
}
```

- [ ] **Step 2: Destructure the new prop and pass it to `useReactTable`**

Change the function signature from:
```tsx
export function WrittenProductTable({ products, onEdit }: WrittenProductTableProps) {
```
to:
```tsx
export function WrittenProductTable({ products, onEdit, columnVisibility = {} }: WrittenProductTableProps) {
```

Change the `useReactTable` call from:
```tsx
  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.rowIndex),
  });
```
to:
```tsx
  const table = useReactTable({
    data: products,
    columns,
    state: { columnVisibility },
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.rowIndex),
  });
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `written-product-table.tsx`.

- [ ] **Step 4: Commit**

```bash
cd e:/projects/sheet-admin && git add components/written-products/written-product-table.tsx && git commit -m "feat: add columnVisibility prop to WrittenProductTable"
```

---

## Task 2: Create `WrittenViewsBar`

**Files:**
- Create: `components/written-products/written-views-bar.tsx`

- [ ] **Step 1: Create the file with column definitions and types**

Create `components/written-products/written-views-bar.tsx` with this full content:

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

export type CustomView = {
  id: string;
  name: string;
  columns: string[];
};

const MAIN_COLUMNS = [
  { id: 'textLink', label: 'Text Link' },
  { id: 'country', label: 'Country' },
  { id: 'cityDestination', label: 'City / Destination' },
  { id: 'state', label: 'State' },
  { id: 'tourType', label: 'Tour Type' },
];

const STATUS_COLUMNS = [
  { id: 'ccOk', label: 'CC OK' },
  { id: 'isOk', label: 'IS OK' },
  { id: 'rrOk', label: 'RR OK' },
  { id: 'ssOk', label: 'SS OK' },
  { id: 'contentExist', label: 'Content' },
  { id: 'b2b', label: 'B2B' },
  { id: 'b2c', label: 'B2C' },
  { id: 'ssNotes', label: 'SS Notes' },
];

const ALL_DEFAULT_COLUMNS = [
  ...MAIN_COLUMNS.map((c) => c.id),
  ...STATUS_COLUMNS.map((c) => c.id),
];

interface WrittenViewsBarProps {
  activeViewId: string;
  customViews: CustomView[];
  onViewSelect: (id: string) => void;
  onViewDelete: (id: string) => void;
  onViewAdd: (view: CustomView) => void;
}

export function WrittenViewsBar({
  activeViewId,
  customViews,
  onViewSelect,
  onViewDelete,
  onViewAdd,
}: WrittenViewsBarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        aria-pressed={activeViewId === 'default'}
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
          role="group"
          aria-label={view.name}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors',
            activeViewId === view.id
              ? 'bg-[hsl(var(--text-primary))] text-[hsl(var(--background))]'
              : 'border border-[hsl(var(--border))] text-[hsl(var(--text-secondary))] hover:border-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))]',
          )}
        >
          <button type="button" aria-pressed={activeViewId === view.id} onClick={() => onViewSelect(view.id)}>
            {view.name}
          </button>
          <button
            type="button"
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
    new Set(ALL_DEFAULT_COLUMNS),
  );

  useEffect(() => {
    if (open) {
      setName('');
      setSelectedColumns(new Set(ALL_DEFAULT_COLUMNS));
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

  const canSave = name.trim().length > 0 && selectedColumns.size > 0;

  function handleSave() {
    if (!canSave) return;
    onSave({
      id: crypto.randomUUID(),
      name: name.trim(),
      columns: [...selectedColumns],
    });
  }

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
            onKeyDown={(e) => { if (e.key === 'Enter' && canSave) handleSave(); }}
            autoFocus
          />
          <ScrollArea className="h-72 rounded-md border border-[hsl(var(--border))] p-3">
            <div className="space-y-4">
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--text-tertiary))]">
                  Main Columns
                </p>
                <div className="space-y-1">
                  {MAIN_COLUMNS.map((col) => (
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

              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--text-tertiary))]">
                  Status Columns
                </p>
                <div className="space-y-1">
                  {STATUS_COLUMNS.map((col) => (
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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `written-views-bar.tsx`.

- [ ] **Step 3: Commit**

```bash
cd e:/projects/sheet-admin && git add components/written-products/written-views-bar.tsx && git commit -m "feat: add WrittenViewsBar component with column picker dialog"
```

---

## Task 3: Wire views state into `WrittenProductsClient`

**Files:**
- Modify: `app/(app)/written-products/written-products-client.tsx`

- [ ] **Step 1: Add imports**

At the top of `app/(app)/written-products/written-products-client.tsx`, add these imports after the existing ones:

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { VisibilityState } from '@tanstack/react-table';
import { WrittenViewsBar, type CustomView } from '@/components/written-products/written-views-bar';
```

> Note: the file currently has `import { useMemo, useState } from 'react'`. Replace that line with the `useCallback, useEffect, useMemo, useState` import above.

- [ ] **Step 2: Add view state and `columnVisibility` computation**

First, add this constant at the **module level** (outside the `WrittenProductsClient` function, near the top of the file after the imports):

```tsx
const ALL_WP_COLUMN_IDS = [
  'textLink', 'country', 'cityDestination', 'state', 'tourType',
  'ccOk', 'isOk', 'rrOk', 'ssOk', 'contentExist', 'b2b', 'b2c', 'ssNotes',
];
```

Then, inside `WrittenProductsClient`, after the existing state declarations (after the `isDeleting` line), add:

```tsx
  const [activeViewId, setActiveViewId] = useState<string>('default');
  const [customViews, setCustomViews] = useState<CustomView[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sheet-admin:written-custom-views');
      if (stored) setCustomViews(JSON.parse(stored) as CustomView[]);
    } catch {
      // ignore malformed storage
    }
  }, []);

  const columnVisibility = useMemo((): VisibilityState => {
    if (activeViewId === 'default') return {};
    const view = customViews.find((v) => v.id === activeViewId);
    if (!view) return {};
    const cols = new Set(view.columns);
    return Object.fromEntries(ALL_WP_COLUMN_IDS.map((id) => [id, cols.has(id)]));
  }, [activeViewId, customViews]);

  const handleViewAdd = useCallback((view: CustomView) => {
    const next = [...customViews, view];
    setCustomViews(next);
    localStorage.setItem('sheet-admin:written-custom-views', JSON.stringify(next));
    setActiveViewId(view.id);
  }, [customViews]);

  const handleViewDelete = useCallback((id: string) => {
    const next = customViews.filter((v) => v.id !== id);
    setCustomViews(next);
    localStorage.setItem('sheet-admin:written-custom-views', JSON.stringify(next));
    if (activeViewId === id) setActiveViewId('default');
  }, [customViews, activeViewId]);
```

- [ ] **Step 3: Render `WrittenViewsBar` in the JSX**

In the JSX, locate the filter bar section:
```tsx
      <div className="px-4 py-2 border-b border-[hsl(var(--border))]">
        <WrittenProductFilterBar
          allProducts={products ?? []}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>
```

Replace it with:
```tsx
      <div className="px-4 py-2 border-b border-[hsl(var(--border))]">
        <WrittenViewsBar
          activeViewId={activeViewId}
          customViews={customViews}
          onViewSelect={setActiveViewId}
          onViewDelete={handleViewDelete}
          onViewAdd={handleViewAdd}
        />
      </div>

      <div className="px-4 py-2 border-b border-[hsl(var(--border))]">
        <WrittenProductFilterBar
          allProducts={products ?? []}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>
```

- [ ] **Step 4: Pass `columnVisibility` to `WrittenProductTable`**

Find:
```tsx
          <WrittenProductTable
            products={filteredProducts}
            onEdit={setEditProduct}
          />
```

Replace with:
```tsx
          <WrittenProductTable
            products={filteredProducts}
            onEdit={setEditProduct}
            columnVisibility={columnVisibility}
          />
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 6: Smoke-test in browser**

Start dev server if not running:
```bash
cd e:/projects/sheet-admin && npm run dev
```

Navigate to `http://localhost:3000/written-products`. Verify:
1. "Default" pill is shown and active — all columns visible
2. "Add Custom View" button opens the dialog with two column groups (Main / Status)
3. Creating a view switches to it and hides unchecked columns
4. The X button on a custom view deletes it and returns to Default
5. Refreshing the page preserves custom views (localStorage)

- [ ] **Step 7: Commit**

```bash
cd e:/projects/sheet-admin && git add app/\(app\)/written-products/written-products-client.tsx && git commit -m "feat: wire column views into WrittenProductsClient"
```
