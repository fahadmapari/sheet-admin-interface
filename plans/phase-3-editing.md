# Phase 3 — Editing (Inline Cell Edit, Write API Routes, Product Detail, Add New)

## Status at start of this phase
- ✅ Next.js 14 scaffold
- ✅ Google Sheets API wrapper (`lib/sheets.ts`)
- ✅ Type definitions (`lib/types.ts`, `lib/constants.ts`, `lib/utils.ts`)
- ✅ API routes: GET /api/products, GET /api/filters, GET /api/stats
- ✅ Products table with virtual scroll, column groups, visibility, filter bar, global search, sticky columns
- **Tasks 12–15 begin here**

## Context

Working directory: `e:/projects/sheet-admin`
Framework: Next.js 14 App Router, TypeScript strict, Tailwind CSS, shadcn/ui (New York/Zinc)
Installed packages: `react-hook-form`, `zod`, `@hookform/resolvers`, `swr`, `sonner`

`lib/sheets.ts` exports: `updateRow`, `updateCell`, `appendRow` — all ready to use.
`lib/utils.ts` exports: `productToRow`, `rowToProduct`
`lib/types.ts` exports: `TourProduct`, `ProductStatus`, `PIC`
`lib/constants.ts` exports: `FIELD_LABELS`, `COLUMN_GROUPS`, `BOOLEAN_FIELDS`, `PRODUCT_STATUSES`, `PIC_VALUES`, `STATUS_COLORS`

Run `npm install` if node_modules is missing. TypeScript must stay clean (`npx tsc --noEmit`).

---

## Task 12 — Inline Cell Editing with Auto-Save

Allow users to click any cell in the products table and edit it in place. The edit auto-saves to the Google Sheet via API on blur or Enter.

### API route needed (Task 13 adds full PUT, but for inline edit we need a PATCH endpoint)

Create `app/api/products/[rowIndex]/route.ts` with:
- `PUT` — update entire row
- `PATCH` — update a single cell (`{ field: string, value: string }`)
- `DELETE` — delete a row (stub for now, full implementation in Phase 4)

```typescript
// app/api/products/[rowIndex]/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { updateRow, updateCell, deleteRow } from '@/lib/sheets';
import { productToRow } from '@/lib/utils';
import { FIELD_TO_COL } from '@/lib/constants';
import type { TourProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Params = { params: { rowIndex: string } };

export async function PUT(req: NextRequest, { params }: Params) {
  const rowIndex = parseInt(params.rowIndex, 10);
  if (isNaN(rowIndex) || rowIndex < 2) {
    return NextResponse.json({ error: 'Invalid rowIndex' }, { status: 400 });
  }
  try {
    const body = await req.json() as Omit<TourProduct, 'rowIndex'>;
    const rowValues = productToRow(body);
    await updateRow(rowIndex, rowValues);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const rowIndex = parseInt(params.rowIndex, 10);
  if (isNaN(rowIndex) || rowIndex < 2) {
    return NextResponse.json({ error: 'Invalid rowIndex' }, { status: 400 });
  }
  try {
    const body = await req.json() as { field: string; value: string };
    const colIndex = FIELD_TO_COL[body.field as keyof typeof FIELD_TO_COL];
    if (colIndex === undefined) {
      return NextResponse.json({ error: `Unknown field: ${body.field}` }, { status: 400 });
    }
    await updateCell(rowIndex, colIndex, body.value);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const rowIndex = parseInt(params.rowIndex, 10);
  if (isNaN(rowIndex) || rowIndex < 2) {
    return NextResponse.json({ error: 'Invalid rowIndex' }, { status: 400 });
  }
  try {
    await deleteRow(rowIndex);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

### `components/products/inline-edit-cell.tsx`

This component renders either a static cell value or an input when the cell is being edited.

Props:
```typescript
interface InlineEditCellProps {
  product: TourProduct;
  field: keyof Omit<TourProduct, 'rowIndex'>;
  onSaved: (field: string, value: string) => void; // optimistic update callback
}
```

Behaviour:
1. **Display mode** — render the cell value (formatted, truncated if long)
2. **Click** → switch to edit mode
3. **Edit mode** — render appropriate input:
   - `boolean` fields (`BOOLEAN_FIELDS`) → `<Switch>` that saves immediately on toggle
   - `productStatus` → `<Select>` with PRODUCT_STATUSES options, saves on change
   - `pic` → `<Select>` with PIC_VALUES options, saves on change
   - Long text fields (`notes`, `notesGeneral`, `qualityRemarks`, `componentsOfTour`) → `<Textarea>`
   - All others → `<Input type="text">`
4. **Save** on blur or Enter (for single-line inputs) → call PATCH endpoint
5. **Cancel** on Escape → revert to original value
6. **Saving state** — show a subtle spinner overlay during the API call
7. **Success** — brief green flash (use `sonner` toast: `toast.success('Saved')`)
8. **Error** — red flash + `toast.error('Failed to save: ...')`, revert to original
9. **Debounce** — debounce text input saves by 300ms (don't fire on every keystroke)

```typescript
// Skeleton implementation pattern
export function InlineEditCell({ product, field, onSaved }: InlineEditCellProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(product[field] ?? ''));
  const [saving, setSaving] = useState(false);

  const save = async (newValue: string) => {
    setSaving(true);
    try {
      await fetch(`/api/products/${product.rowIndex}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value: newValue }),
      });
      onSaved(field, newValue);
      toast.success('Saved');
    } catch {
      toast.error('Failed to save');
      setValue(String(product[field] ?? '')); // revert
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  // ... render display or input based on `editing` state
}
```

### Wire into `product-table.tsx`

Replace each cell renderer with `<InlineEditCell>`. Keep the `onSaved` callback updating the local SWR cache (optimistic update) using `mutate()`.

**Commit message:** `feat: inline cell editing with auto-save`

---

## Task 13 — API Routes: POST /api/products (Add New Row)

### File to update
`app/api/products/route.ts` — add POST handler

```typescript
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Omit<TourProduct, 'rowIndex'>;
    const rowValues = productToRow(body);
    await appendRow(rowValues);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Commit message:** `feat: POST /api/products for adding new rows`

---

## Task 14 — Product Detail / Edit Page

### File to create
`app/products/[rowIndex]/page.tsx`

This is a **full-page form** for viewing and editing a single product. It fetches the product from `/api/products` (or directly from the products SWR cache), organises fields into tabbed sections matching the 11 column groups, and uses React Hook Form + Zod validation.

### Layout
- **Back button** → `/products`
- **Product title** (productName or link, whichever is available)
- **Status badge** (colour-coded from STATUS_COLORS)
- **Tabs** — one tab per column group (11 tabs)
- **Save button** — submits the full form via PUT /api/products/[rowIndex]
- **Reset button** — reverts to fetched values

### Data fetching
The page receives `rowIndex` as a route param. Fetch all products from `/api/products` client-side (SWR, same key as the table — shared cache) and find the one with matching `rowIndex`.

OR: make a server component that fetches from the Sheets API directly (simpler, avoid cache issues). Recommended: server component.

```typescript
// app/products/[rowIndex]/page.tsx — server component
import { fetchAllRows } from '@/lib/sheets';
import { rowToProduct } from '@/lib/utils';
import { ProductDetailClient } from '@/components/products/product-detail-tabs';
import { notFound } from 'next/navigation';

export default async function ProductDetailPage({
  params,
}: {
  params: { rowIndex: string };
}) {
  const rowIndex = parseInt(params.rowIndex, 10);
  if (isNaN(rowIndex) || rowIndex < 2) notFound();

  const rows = await fetchAllRows();
  const row = rows[rowIndex - 1]; // 1-based → 0-based array index
  if (!row) notFound();
  const product = rowToProduct(row, rowIndex);

  return <ProductDetailClient product={product} />;
}
```

### `components/products/product-detail-tabs.tsx`

Client component with React Hook Form.

```typescript
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
// ... shadcn form components

// Zod schema — all fields optional except required ones
const schema = z.object({
  country: z.string().min(1, 'Country is required'),
  city: z.string().min(1, 'City is required'),
  productType: z.string().min(1, 'Product type is required'),
  // ... all other fields as optional strings/booleans/numbers
});
```

**Field rendering by type:**
- `boolean` fields → `<Switch>` with label
- `productStatus` → `<Select>` with status options
- `pic` → `<Select>` with PIC options
- URL fields (`providerUrl`, `attractionLink`, `productLink`, `centralProviderLinks`, `centralTransportLinks`) → `<Input type="url">` + clickable link icon
- Long text (`notes`, `notesGeneral`, `qualityRemarks`, `componentsOfTour`) → `<Textarea rows={4}`
- Date fields (`dateOfDispatch`, `dateUploaded`) → `<Input type="date">`
- All others → `<Input type="text">`

**Save handler:**
```typescript
const onSubmit = async (data: z.infer<typeof schema>) => {
  const res = await fetch(`/api/products/${product.rowIndex}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (res.ok) toast.success('Product saved');
  else toast.error('Failed to save product');
};
```

**Special displays:**
- `productLink` → render as a `<Button variant="outline">` that opens the URL in a new tab
- `attractionLink` → render as a clickable anchor
- `readyForUpload` → large prominent `<Switch>` with green/red label

**Commit message:** `feat: product detail/edit page with tabbed form`

---

## Task 15 — Add New Product Slide-Over

A **slide-over panel** (shadcn `Sheet`) that opens from the right when the user clicks "Add Product".

### Files to create
- `components/products/product-form.tsx` — the form (reused for add new)

### `components/products/product-form.tsx`

Same React Hook Form setup as the detail page, but:
- **Required fields**: Country, City, Product Type, Link
- All other fields optional (default to empty/false)
- On submit → POST /api/products

```typescript
const onSubmit = async (data: FormData) => {
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (res.ok) {
    toast.success('Product added');
    mutate('/api/products'); // refresh table
    onClose();
  } else {
    toast.error('Failed to add product');
  }
};
```

Fields shown in the slide-over (keep it focused — not all 70 fields):
- Country (required) — autocomplete
- City (required) — text
- Product Type (required) — select
- Link (required) — text
- Product Name — text
- Duration — text
- Product Status — select
- PIC — select
- Notes — textarea
- Ready for Upload — switch

The "full" editing experience is in the detail page. The slide-over is just for initial creation with essential fields.

### Integration

In `app/products/page.tsx`:
- Add an "Add Product" button (top-right of header)
- Use `Sheet` from shadcn/ui: `SheetTrigger` on the button, `SheetContent` contains `ProductForm`
- After successful add, SWR mutate refreshes the table

**Commit message:** `feat: add new product slide-over panel`

---

## Verification

After all tasks in this phase:
1. `npx tsc --noEmit` — must pass with zero errors
2. `npm run build` — must succeed
3. Routes that must exist:
   - `GET /api/products` ✅
   - `POST /api/products` ✅ (new)
   - `GET /api/products/[rowIndex]` — not needed (detail page is server component)
   - `PUT /api/products/[rowIndex]` ✅ (new)
   - `PATCH /api/products/[rowIndex]` ✅ (new)
   - `DELETE /api/products/[rowIndex]` ✅ (stub, full implementation Phase 4)
