# Written Products Table Virtualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add row virtualization to `WrittenProductTable` so only in-viewport rows are rendered, keeping the DOM lean for hundreds-to-thousands of rows.

**Architecture:** `WrittenProductTable` takes ownership of the scroll container (matching the `product-table.tsx` pattern). A `containerRef` on the outermost div feeds `useVirtualizer`; padding spacer rows replace off-screen rows. The client wrapper loses `overflow-auto` and gains `min-h-0` so height flows down into the table.

**Tech Stack:** `@tanstack/react-virtual` v3 (already installed), `@tanstack/react-table` v8, React 18, TypeScript, Next.js 16

---

### Task 1: Update the client wrapper to pass height down

**Files:**
- Modify: `app/(app)/written-products/written-products-client.tsx:132`

- [ ] **Step 1: Change the scroll wrapper div**

In `written-products-client.tsx`, find line 132:

```tsx
<div className="flex-1 overflow-auto">
```

Replace with:

```tsx
<div className="flex-1 overflow-hidden min-h-0">
```

This stops the parent from being the scroll container so the table component can own it.

- [ ] **Step 2: Verify the dev server still renders the page without console errors**

Run: `npm run dev`
Navigate to `/written-products`. The page should load (scrolling will be broken until Task 2 is complete — that's expected).

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/written-products/written-products-client.tsx
git commit -m "refactor: pass height to WrittenProductTable for virtualization"
```

---

### Task 2: Add virtualization to WrittenProductTable

**Files:**
- Modify: `components/written-products/written-product-table.tsx`

- [ ] **Step 1: Add imports**

Replace the existing import block at the top of `written-product-table.tsx`:

```tsx
// components/written-products/written-product-table.tsx
'use client';

import { useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { WrittenProduct } from '@/lib/types';
```

- [ ] **Step 2: Add containerRef and virtualizer inside the component**

After the `table` declaration (after the `useReactTable(...)` call), add:

```tsx
  const rows = table.getRowModel().rows;

  const containerRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 41,
    overscan: 10,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0;
```

- [ ] **Step 3: Update the JSX — outer div**

Replace:

```tsx
    <div className="w-full overflow-auto">
```

With:

```tsx
    <div ref={containerRef} className="h-full overflow-auto">
```

- [ ] **Step 4: Make thead sticky**

Replace:

```tsx
        <thead>
```

With:

```tsx
        <thead className="sticky top-0 z-10 bg-[hsl(var(--background))]">
```

- [ ] **Step 5: Replace tbody with virtual rows**

Replace the entire `<tbody>` block:

```tsx
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--surface))] transition-colors"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2 whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-8 text-center text-[hsl(var(--text-tertiary))] text-sm"
              >
                No written products found.
              </td>
            </tr>
          )}
        </tbody>
```

With:

```tsx
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-8 text-center text-[hsl(var(--text-tertiary))] text-sm"
              >
                No written products found.
              </td>
            </tr>
          ) : (
            <>
              {paddingTop > 0 && (
                <tr>
                  <td style={{ height: `${paddingTop}px` }} colSpan={columns.length} />
                </tr>
              )}
              {virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <tr
                    key={row.id}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--surface))] transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {paddingBottom > 0 && (
                <tr>
                  <td style={{ height: `${paddingBottom}px` }} colSpan={columns.length} />
                </tr>
              )}
            </>
          )}
        </tbody>
```

- [ ] **Step 6: Verify in browser**

With `npm run dev` running, navigate to `/written-products`.
- The table should scroll smoothly
- The sticky header should stay visible while scrolling
- Only ~20–30 rows should be in the DOM at any time (verify in DevTools Elements panel)
- Edit, delete, and filter actions should still work correctly

- [ ] **Step 7: Commit**

```bash
git add components/written-products/written-product-table.tsx
git commit -m "feat: virtualize WrittenProductTable rows with @tanstack/react-virtual"
```
