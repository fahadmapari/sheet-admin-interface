# Phase 4 — Bulk Actions, Delete, and Data Export

## Status at start of this phase
- ✅ Next.js 14 scaffold, Sheets API, types, constants, utils
- ✅ API routes: GET, POST /api/products; PUT, PATCH, DELETE /api/products/[rowIndex]
- ✅ Products table: virtual scroll, column groups, visibility, filter bar, search, sticky columns
- ✅ Inline cell editing, product detail page, add new slide-over
- **Tasks 16–19 begin here**

## Context

Working directory: `e:/projects/sheet-admin`
Framework: Next.js 14 App Router, TypeScript strict, Tailwind CSS, shadcn/ui
Installed packages: `xlsx`, `swr`, `sonner`

`lib/sheets.ts` exports: `batchUpdateRows`, `deleteRow`
`lib/utils.ts` exports: `productToRow`, `rowToProduct`
`lib/constants.ts` exports: `COLUMN_HEADERS`, `COLUMN_GROUPS`, `PRODUCT_STATUSES`, `PIC_VALUES`

Run `npm install` if node_modules is missing. TypeScript must stay clean (`npx tsc --noEmit`).

---

## Task 16 — Row Selection + Bulk Actions Toolbar

Add a **checkbox column** to the products table for row selection, and a **bulk actions toolbar** that appears when one or more rows are selected.

### Row selection

In `components/products/product-table.tsx`:
- Add a checkbox column as the first column (before Country)
- Use TanStack Table's built-in row selection: `enableRowSelection: true`, `onRowSelectionChange`, `rowSelection` state
- Header checkbox → select/deselect all visible rows
- Individual row checkbox → select/deselect that row
- Checkbox column is NOT collapsible and NOT hidden by column visibility toggle

### `components/products/bulk-actions-toolbar.tsx`

A toolbar that appears (slides down or fades in) when `rowSelection` has any selected rows.

```typescript
interface BulkActionsToolbarProps {
  selectedProducts: TourProduct[];
  onClearSelection: () => void;
  onMutate: () => void; // SWR mutate to refresh table
}
```

**Actions in the toolbar:**
1. **Set PIC** — `<Select>` with PIC_VALUES → sets `pic` field on all selected rows
2. **Set Status** — `<Select>` with PRODUCT_STATUSES → sets `productStatus` on all
3. **Mark Ready for Upload** — toggle button → sets `readyForUpload` to `true` on all
4. **Unmark Ready for Upload** — sets `readyForUpload` to `false` on all
5. **Delete** — opens a confirmation dialog, then deletes all selected rows
6. **Clear selection** — X button

Each action (except Delete and Clear) calls `PATCH /api/products/bulk`.

Display: `{N} rows selected` count + action buttons.

### Integration in `app/products/page.tsx`

Pass `rowSelection`, `setRowSelection` state down to both the table and the toolbar. The toolbar appears conditionally when selection is non-empty.

**Commit message:** `feat: row selection and bulk actions toolbar`

---

## Task 17 — Bulk Update API Route

### File to create
`app/api/products/bulk/route.ts`

```typescript
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { batchUpdateRows, fetchAllRows } from '@/lib/sheets';
import { rowToProduct, productToRow } from '@/lib/utils';
import { FIELD_TO_COL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

// PATCH /api/products/bulk
// Body: { rowIndexes: number[], field: string, value: string }
// Sets the same field=value on all specified rows
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as {
      rowIndexes: number[];
      field: string;
      value: string;
    };

    const { rowIndexes, field, value } = body;

    if (!Array.isArray(rowIndexes) || rowIndexes.length === 0) {
      return NextResponse.json({ error: 'rowIndexes must be a non-empty array' }, { status: 400 });
    }
    if (!field || typeof value !== 'string') {
      return NextResponse.json({ error: 'field and value are required' }, { status: 400 });
    }

    const colIndex = FIELD_TO_COL[field as keyof typeof FIELD_TO_COL];
    if (colIndex === undefined) {
      return NextResponse.json({ error: `Unknown field: ${field}` }, { status: 400 });
    }

    // Validate all rowIndexes are >= 2
    if (rowIndexes.some(r => r < 2)) {
      return NextResponse.json({ error: 'All rowIndexes must be >= 2' }, { status: 400 });
    }

    // Fetch all rows to get current data, then update only the target field
    const allRows = await fetchAllRows();

    const updates = rowIndexes.map(rowIndex => {
      const currentRow = [...(allRows[rowIndex - 1] ?? [])];
      // Pad row to 70 columns if needed
      while (currentRow.length < 70) currentRow.push('');
      currentRow[colIndex] = value;
      return { rowIndex, values: currentRow };
    });

    await batchUpdateRows(updates);

    return NextResponse.json({ ok: true, updated: rowIndexes.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

### Wire bulk actions toolbar to this endpoint

In `components/products/bulk-actions-toolbar.tsx`, update each action handler to call `PATCH /api/products/bulk`:

```typescript
const applyBulkField = async (field: string, value: string) => {
  const rowIndexes = selectedProducts.map(p => p.rowIndex);
  const res = await fetch('/api/products/bulk', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rowIndexes, field, value }),
  });
  if (res.ok) {
    toast.success(`Updated ${rowIndexes.length} rows`);
    onMutate();
    onClearSelection();
  } else {
    toast.error('Bulk update failed');
  }
};
```

**Commit message:** `feat: bulk update API route and toolbar wiring`

---

## Task 18 — Delete with Confirmation

### Single row delete

In the products table, each row should have a context menu or a delete button (visible on row hover). Use a `DropdownMenu` from shadcn/ui triggered by a `MoreHorizontal` icon button at the end of each row.

Menu options:
- **Edit** → navigate to `/products/[rowIndex]`
- **Delete** → open confirmation dialog

### Bulk delete

Already wired in Task 16's toolbar. This task implements the confirmation dialog.

### `components/products/delete-confirm-dialog.tsx`

```typescript
interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number; // number of rows to delete
  onConfirm: () => Promise<void>;
}
```

Uses `Dialog` from shadcn/ui. Shows:
- Title: `Delete {count} product{count > 1 ? 's' : ''}?`
- Description: `This will permanently remove the row(s) from the Google Sheet. This cannot be undone.`
- Cancel button
- Delete button (red/destructive variant)

### Delete implementation

For **single row delete:**
```typescript
await fetch(`/api/products/${rowIndex}`, { method: 'DELETE' });
```

For **bulk delete** (multiple rows):
- Delete rows in **reverse order** (highest rowIndex first) so row numbers don't shift during deletion
- Call `DELETE /api/products/[rowIndex]` sequentially (not in parallel — sheet state changes after each delete)
- Or: add a `DELETE /api/products/bulk` endpoint that deletes in reverse order server-side

Recommended: add a bulk delete endpoint:

```typescript
// app/api/products/bulk/route.ts — add DELETE handler
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json() as { rowIndexes: number[] };
    // Delete in reverse order to preserve row numbers
    const sorted = [...body.rowIndexes].sort((a, b) => b - a);
    for (const rowIndex of sorted) {
      await deleteRow(rowIndex);
    }
    return NextResponse.json({ ok: true, deleted: sorted.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Commit message:** `feat: delete with confirmation dialog (single and bulk)`

---

## Task 19 — Export (CSV and XLSX)

Add **Export** buttons to the products page that download the currently filtered/visible data.

### Export button

In `app/products/page.tsx` toolbar, add an Export button with a dropdown:
- Export as CSV
- Export as XLSX

Only export the **filtered + searched** rows (same data currently displayed in the table).
Only export **visible columns** (respecting column visibility state).

### CSV export

```typescript
function exportCsv(products: TourProduct[], visibleFields: string[]) {
  const headers = visibleFields.map(f => FIELD_LABELS[f as keyof typeof FIELD_LABELS] ?? f);
  const rows = products.map(p =>
    visibleFields.map(f => {
      const val = p[f as keyof TourProduct];
      if (val === null || val === undefined) return '';
      if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
      // Escape commas and quotes for CSV
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
  );
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### XLSX export

Use the `xlsx` package (already installed):

```typescript
import * as XLSX from 'xlsx';

function exportXlsx(products: TourProduct[], visibleFields: string[]) {
  const headers = visibleFields.map(f => FIELD_LABELS[f as keyof typeof FIELD_LABELS] ?? f);
  const rows = products.map(p =>
    visibleFields.map(f => {
      const val = p[f as keyof TourProduct];
      if (val === null || val === undefined) return '';
      if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
      return val;
    })
  );
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  XLSX.writeFile(wb, `products-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
```

**Note:** `xlsx` must be imported dynamically or in a `'use client'` component since it uses browser APIs for file download.

### Integration

Create `components/products/export-button.tsx` — a `DropdownMenu` button that triggers either export. Receives the currently visible + filtered products as a prop.

**Commit message:** `feat: CSV and XLSX export for filtered products`

---

## Verification

After all tasks in this phase:
1. `npx tsc --noEmit` — must pass with zero errors
2. `npm run build` — must succeed
3. Bulk delete must delete in reverse row order
4. Export must include only filtered rows and visible columns
