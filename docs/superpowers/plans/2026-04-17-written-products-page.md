# Written Products Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-CRUD "Written Products" page at `/written-products` backed by a separate Google Sheets document, with search, filters, and export.

**Architecture:** Parallel implementation mirroring the products page — new `WrittenProduct` type, a dedicated Google Sheets helper module using `WRITTEN_PRODUCTS_SPREADSHEET_ID`, REST API routes, and fresh React components that reuse shadcn/ui primitives and TanStack Table. No assembly, shareables, or column-mapping config.

**Tech Stack:** Next.js 16 App Router, TypeScript, TanStack Table v8, SWR, shadcn/ui, Sonnet, `googleapis` (existing).

---

## File Map

| Status | Path | Role |
|--------|------|------|
| modify | `lib/types.ts` | Add `WrittenProduct` interface |
| create | `lib/written-products-utils.ts` | `rowToWrittenProduct`, `writtenProductToRow` |
| create | `lib/written-products-sheets.ts` | Google Sheets I/O for the second spreadsheet |
| create | `app/api/written-products/route.ts` | GET (list) + POST (create) |
| create | `app/api/written-products/[rowIndex]/route.ts` | GET + PUT + DELETE |
| create | `components/written-products/written-product-table.tsx` | TanStack Table display |
| create | `components/written-products/written-product-form.tsx` | Create / edit form |
| create | `components/written-products/written-product-detail-sheet.tsx` | Slide-in edit panel |
| create | `components/written-products/written-product-filter-bar.tsx` | Search + multi-select filters |
| create | `components/written-products/written-product-export-button.tsx` | Export to Google Sheets / CSV |
| create | `components/written-products/written-product-detail-page.tsx` | Full-page edit client component |
| create | `app/(app)/written-products/page.tsx` | Server component entry |
| create | `app/(app)/written-products/loading.tsx` | Loading skeleton |
| create | `app/(app)/written-products/written-products-client.tsx` | Main client component |
| create | `app/(app)/written-products/[rowIndex]/page.tsx` | Direct-URL edit page |
| modify | `components/layout/sidebar.tsx` | Add "Written Products" nav item |

---

## Task 1: Add `WrittenProduct` type

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add the interface at the end of `lib/types.ts`**

Append after the last export in the file:

```ts
export interface WrittenProduct {
  rowIndex: number;
  country: string;
  cityDestination: string;
  state: string;
  tourType: string;
  textLink: string;
  ccOk: boolean;
  isOk: boolean;
  rrOk: boolean;
  ssOk: boolean;
  contentExist: boolean;
  b2b: boolean;
  b2c: boolean;
  ssNotes: boolean;
}
```

- [ ] **Step 2: Verify lint passes**

```bash
npm run lint
```

Expected: no errors related to types.ts.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add WrittenProduct type"
```

---

## Task 2: Utility functions

**Files:**
- Create: `lib/written-products-utils.ts`

- [ ] **Step 1: Create the file**

```ts
// lib/written-products-utils.ts
import type { WrittenProduct } from '@/lib/types';

function parseBoolean(v: string | undefined): boolean {
  return v?.toUpperCase() === 'TRUE';
}

export function rowToWrittenProduct(row: string[], rowIndex: number): WrittenProduct {
  return {
    rowIndex,
    country: row[0] ?? '',
    cityDestination: row[1] ?? '',
    state: row[2] ?? '',
    tourType: row[3] ?? '',
    textLink: row[4] ?? '',
    ccOk: parseBoolean(row[5]),
    isOk: parseBoolean(row[6]),
    rrOk: parseBoolean(row[7]),
    ssOk: parseBoolean(row[8]),
    contentExist: parseBoolean(row[9]),
    b2b: parseBoolean(row[10]),
    b2c: parseBoolean(row[11]),
    ssNotes: parseBoolean(row[12]),
  };
}

export function writtenProductToRow(product: Omit<WrittenProduct, 'rowIndex'>): string[] {
  return [
    product.country,
    product.cityDestination,
    product.state,
    product.tourType,
    product.textLink,
    product.ccOk ? 'TRUE' : 'FALSE',
    product.isOk ? 'TRUE' : 'FALSE',
    product.rrOk ? 'TRUE' : 'FALSE',
    product.ssOk ? 'TRUE' : 'FALSE',
    product.contentExist ? 'TRUE' : 'FALSE',
    product.b2b ? 'TRUE' : 'FALSE',
    product.b2c ? 'TRUE' : 'FALSE',
    product.ssNotes ? 'TRUE' : 'FALSE',
  ];
}
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/written-products-utils.ts
git commit -m "feat: add written products row/type conversion utilities"
```

---

## Task 3: Google Sheets helper module

**Files:**
- Create: `lib/written-products-sheets.ts`

> **Note:** `lib/sheets.ts` functions hardcode `SPREADSHEET_ID` and cache `getSheetId` by sheet name only — they cannot be reused for a different spreadsheet. This module talks directly to the Google Sheets API using `getUserSheetsClient` (already exported from `lib/sheets.ts`) and `WRITTEN_PRODUCTS_SPREADSHEET_ID`.

- [ ] **Step 1: Create the file**

```ts
// lib/written-products-sheets.ts
import 'server-only';
import { getUserSheetsClient } from '@/lib/sheets';

function getSpreadsheetId(): string {
  const v = process.env.WRITTEN_PRODUCTS_SPREADSHEET_ID;
  if (!v) throw new Error('Missing required environment variable: WRITTEN_PRODUCTS_SPREADSHEET_ID');
  return v;
}

const SHEET_NAME = 'Sheet1';
const RANGE = `'${SHEET_NAME}'!A:M`;

let _cachedSheetId: number | null = null;

async function resolveSheetId(accessToken: string): Promise<number> {
  if (_cachedSheetId !== null) return _cachedSheetId;
  const sheets = getUserSheetsClient(accessToken);
  const res = await sheets.spreadsheets.get({ spreadsheetId: getSpreadsheetId() });
  const id = res.data.sheets?.[0]?.properties?.sheetId;
  if (id === undefined || id === null) throw new Error('Cannot determine sheet ID for written products');
  _cachedSheetId = id;
  return id;
}

export async function fetchAllWrittenProductRows(accessToken: string): Promise<string[][]> {
  const sheets = getUserSheetsClient(accessToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: RANGE,
  });
  return (res.data.values ?? []) as string[][];
}

export async function appendWrittenProductRow(accessToken: string, values: string[]): Promise<number> {
  const sheets = getUserSheetsClient(accessToken);
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: RANGE,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });
  const updatedRange = res.data.updates?.updatedRange ?? '';
  const match = updatedRange.match(/:?[A-Z]+(\d+)/);
  if (!match) throw new Error(`Could not parse row index from updatedRange: ${updatedRange}`);
  return parseInt(match[1], 10);
}

export async function updateWrittenProductRow(
  accessToken: string,
  rowIndex: number,
  values: string[],
): Promise<void> {
  const sheets = getUserSheetsClient(accessToken);
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `'${SHEET_NAME}'!A${rowIndex}:M${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  });
}

export async function deleteWrittenProductRow(accessToken: string, rowIndex: number): Promise<void> {
  if (rowIndex < 2) throw new Error('rowIndex must be >= 2; received ' + rowIndex);
  const sheets = getUserSheetsClient(accessToken);
  const sheetId = await resolveSheetId(accessToken);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
  });
}
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/written-products-sheets.ts
git commit -m "feat: add Google Sheets helpers for written products spreadsheet"
```

---

## Task 4: API route — list and create

**Files:**
- Create: `app/api/written-products/route.ts`

- [ ] **Step 1: Create the route**

```ts
// app/api/written-products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleAccessTokenError, requireGoogleAccessToken } from '@/lib/google-session';
import { fetchAllWrittenProductRows, appendWrittenProductRow } from '@/lib/written-products-sheets';
import { rowToWrittenProduct, writtenProductToRow } from '@/lib/written-products-utils';
import type { WrittenProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const accessToken = await requireGoogleAccessToken();
    const rows = await fetchAllWrittenProductRows(accessToken);
    const products: WrittenProduct[] = rows
      .slice(1)
      .map((row, i) => rowToWrittenProduct(row, i + 2));
    return NextResponse.json(products);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err instanceof GoogleAccessTokenError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const accessToken = await requireGoogleAccessToken();
    const body = (await req.json()) as Omit<WrittenProduct, 'rowIndex'>;
    const values = writtenProductToRow(body);
    const newRowIndex = await appendWrittenProductRow(accessToken, values);
    return NextResponse.json(rowToWrittenProduct(values, newRowIndex), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err instanceof GoogleAccessTokenError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/written-products/route.ts
git commit -m "feat: add written products list and create API routes"
```

---

## Task 5: API route — single row (GET / PUT / DELETE)

**Files:**
- Create: `app/api/written-products/[rowIndex]/route.ts`

- [ ] **Step 1: Create the route**

```ts
// app/api/written-products/[rowIndex]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleAccessTokenError, requireGoogleAccessToken } from '@/lib/google-session';
import {
  fetchAllWrittenProductRows,
  updateWrittenProductRow,
  deleteWrittenProductRow,
} from '@/lib/written-products-sheets';
import { rowToWrittenProduct, writtenProductToRow } from '@/lib/written-products-utils';
import type { WrittenProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ rowIndex: string }> };

function parseRowIndex(str: string): number | null {
  const n = parseInt(str, 10);
  return isNaN(n) || n < 2 ? null : n;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { rowIndex: rowIndexStr } = await params;
    const rowIndex = parseRowIndex(rowIndexStr);
    if (rowIndex === null) return NextResponse.json({ error: 'Invalid row index' }, { status: 400 });

    const accessToken = await requireGoogleAccessToken();
    const rows = await fetchAllWrittenProductRows(accessToken);
    const row = rows[rowIndex - 1];
    if (!row) return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    return NextResponse.json(rowToWrittenProduct(row, rowIndex));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err instanceof GoogleAccessTokenError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { rowIndex: rowIndexStr } = await params;
    const rowIndex = parseRowIndex(rowIndexStr);
    if (rowIndex === null) return NextResponse.json({ error: 'Invalid row index' }, { status: 400 });

    const accessToken = await requireGoogleAccessToken();
    const body = (await req.json()) as Omit<WrittenProduct, 'rowIndex'>;
    const values = writtenProductToRow(body);
    await updateWrittenProductRow(accessToken, rowIndex, values);
    return NextResponse.json(rowToWrittenProduct(values, rowIndex));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err instanceof GoogleAccessTokenError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { rowIndex: rowIndexStr } = await params;
    const rowIndex = parseRowIndex(rowIndexStr);
    if (rowIndex === null) return NextResponse.json({ error: 'Invalid row index' }, { status: 400 });

    const accessToken = await requireGoogleAccessToken();
    await deleteWrittenProductRow(accessToken, rowIndex);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err instanceof GoogleAccessTokenError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/api/written-products/[rowIndex]/route.ts"
git commit -m "feat: add written products single-row GET/PUT/DELETE API routes"
```

---

## Task 6: Table component

**Files:**
- Create: `components/written-products/written-product-table.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/written-products/written-product-table.tsx
'use client';

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { WrittenProduct } from '@/lib/types';

const BOOLEAN_FIELDS = [
  'ccOk', 'isOk', 'rrOk', 'ssOk', 'contentExist', 'b2b', 'b2c', 'ssNotes',
] as const;

const BOOLEAN_LABELS: Record<(typeof BOOLEAN_FIELDS)[number], string> = {
  ccOk: 'CC OK',
  isOk: 'IS OK',
  rrOk: 'RR OK',
  ssOk: 'SS OK',
  contentExist: 'Content',
  b2b: 'B2B',
  b2c: 'B2C',
  ssNotes: 'SS Notes',
};

function BooleanBadge({ value }: { value: boolean }) {
  if (value) {
    return (
      <Badge className="bg-green-100 text-green-700 border border-green-200 text-xs px-1.5">
        ✓
      </Badge>
    );
  }
  return <span className="text-[hsl(var(--text-tertiary))]">—</span>;
}

interface WrittenProductTableProps {
  products: WrittenProduct[];
  onEdit: (product: WrittenProduct) => void;
  onDelete: (product: WrittenProduct) => void;
}

export function WrittenProductTable({ products, onEdit, onDelete }: WrittenProductTableProps) {
  const columns: ColumnDef<WrittenProduct>[] = [
    {
      id: 'textLink',
      accessorKey: 'textLink',
      header: 'Text Link',
      cell: ({ row }) => (
        <span className="font-medium text-sm max-w-[300px] truncate block">
          {row.original.textLink || '—'}
        </span>
      ),
    },
    {
      id: 'country',
      accessorKey: 'country',
      header: 'Country',
      cell: ({ row }) => <span className="text-sm">{row.original.country || '—'}</span>,
    },
    {
      id: 'cityDestination',
      accessorKey: 'cityDestination',
      header: 'City / Destination',
      cell: ({ row }) => <span className="text-sm">{row.original.cityDestination || '—'}</span>,
    },
    {
      id: 'state',
      accessorKey: 'state',
      header: 'State',
      cell: ({ row }) => <span className="text-sm">{row.original.state || '—'}</span>,
    },
    {
      id: 'tourType',
      accessorKey: 'tourType',
      header: 'Tour Type',
      cell: ({ row }) => <span className="text-sm">{row.original.tourType || '—'}</span>,
    },
    ...BOOLEAN_FIELDS.map((field) => ({
      id: field,
      accessorKey: field,
      header: BOOLEAN_LABELS[field],
      cell: ({ row }: { row: Row<WrittenProduct> }) => (
        <BooleanBadge value={row.original[field] as boolean} />
      ),
    })),
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1 justify-end">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onEdit(row.original)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(row.original)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.rowIndex),
  });

  return (
    <div className="w-full overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-[hsl(var(--border))]">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2 text-left text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase tracking-wide whitespace-nowrap"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
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
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/written-products/written-product-table.tsx
git commit -m "feat: add WrittenProductTable component"
```

---

## Task 7: Form component

**Files:**
- Create: `components/written-products/written-product-form.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/written-products/written-product-form.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { WrittenProduct } from '@/lib/types';

type FormData = Omit<WrittenProduct, 'rowIndex'>;

const BOOLEAN_FIELDS = [
  { key: 'ccOk', label: 'CC OK' },
  { key: 'isOk', label: 'IS OK' },
  { key: 'rrOk', label: 'RR OK' },
  { key: 'ssOk', label: 'SS OK' },
  { key: 'contentExist', label: 'Content Exist' },
  { key: 'b2b', label: 'B2B' },
  { key: 'b2c', label: 'B2C' },
  { key: 'ssNotes', label: 'SS Notes' },
] as const;

const EMPTY: FormData = {
  country: '',
  cityDestination: '',
  state: '',
  tourType: '',
  textLink: '',
  ccOk: false,
  isOk: false,
  rrOk: false,
  ssOk: false,
  contentExist: false,
  b2b: false,
  b2c: false,
  ssNotes: false,
};

interface WrittenProductFormProps {
  initialData?: FormData;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function WrittenProductForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: WrittenProductFormProps) {
  const [form, setForm] = useState<FormData>(initialData ?? EMPTY);

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {(
          [
            { key: 'country', label: 'Country' },
            { key: 'cityDestination', label: 'City / Destination' },
            { key: 'state', label: 'State' },
            { key: 'tourType', label: 'Tour Type' },
          ] as const
        ).map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <Label htmlFor={key} className="text-sm">
              {label}
            </Label>
            <Input
              id={key}
              value={form[key]}
              onChange={(e) => setField(key, e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <Label htmlFor="textLink" className="text-sm">
          Text Link <span className="text-destructive">*</span>
        </Label>
        <Input
          id="textLink"
          value={form.textLink}
          onChange={(e) => setField('textLink', e.target.value)}
          className="h-8 text-sm"
          required
        />
      </div>

      <div className="grid grid-cols-4 gap-3 pt-1">
        {BOOLEAN_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <Checkbox
              id={key}
              checked={form[key]}
              onCheckedChange={(checked) => setField(key, checked === true)}
            />
            <Label htmlFor={key} className="text-sm cursor-pointer">
              {label}
            </Label>
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/written-products/written-product-form.tsx
git commit -m "feat: add WrittenProductForm component"
```

---

## Task 8: Detail sheet

**Files:**
- Create: `components/written-products/written-product-detail-sheet.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/written-products/written-product-detail-sheet.tsx
'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { WrittenProductForm } from './written-product-form';
import type { WrittenProduct } from '@/lib/types';
import { toast } from 'sonner';

interface WrittenProductDetailSheetProps {
  product: WrittenProduct | null;
  onClose: () => void;
  onSaved: (updated: WrittenProduct) => void;
}

export function WrittenProductDetailSheet({
  product,
  onClose,
  onSaved,
}: WrittenProductDetailSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: Omit<WrittenProduct, 'rowIndex'>) {
    if (!product) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/written-products/${product.rowIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated: WrittenProduct = await res.json();
      onSaved(updated);
      toast.success('Saved');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={product !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-sm font-medium truncate pr-4">
            {product?.textLink || 'Edit Written Product'}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          {product && (
            <WrittenProductForm
              initialData={product}
              onSubmit={handleSubmit}
              onCancel={onClose}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/written-products/written-product-detail-sheet.tsx
git commit -m "feat: add WrittenProductDetailSheet slide-in edit panel"
```

---

## Task 9: Filter bar

**Files:**
- Create: `components/written-products/written-product-filter-bar.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/written-products/written-product-filter-bar.tsx
'use client';

import { useMemo } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WrittenProduct } from '@/lib/types';

export interface WrittenProductFilters {
  search: string;
  countries: string[];
  tourTypes: string[];
}

export const DEFAULT_WP_FILTERS: WrittenProductFilters = {
  search: '',
  countries: [],
  tourTypes: [],
};

interface WrittenProductFilterBarProps {
  allProducts: WrittenProduct[];
  filters: WrittenProductFilters;
  onFiltersChange: (filters: WrittenProductFilters) => void;
}

export function WrittenProductFilterBar({
  allProducts,
  filters,
  onFiltersChange,
}: WrittenProductFilterBarProps) {
  const countryOptions = useMemo(
    () => [...new Set(allProducts.map((p) => p.country).filter(Boolean))].sort(),
    [allProducts],
  );

  const tourTypeOptions = useMemo(
    () => [...new Set(allProducts.map((p) => p.tourType).filter(Boolean))].sort(),
    [allProducts],
  );

  function toggleMulti(key: 'countries' | 'tourTypes', value: string) {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFiltersChange({ ...filters, [key]: next });
  }

  const hasActiveFilters =
    filters.search !== '' || filters.countries.length > 0 || filters.tourTypes.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Input
          placeholder="Search…"
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="h-8 w-52 text-sm pr-7"
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => onFiltersChange({ ...filters, search: '' })}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <MultiSelectDropdown
        label="Country"
        options={countryOptions}
        selected={filters.countries}
        onToggle={(v) => toggleMulti('countries', v)}
      />

      <MultiSelectDropdown
        label="Tour Type"
        options={tourTypeOptions}
        selected={filters.tourTypes}
        onToggle={(v) => toggleMulti('tourTypes', v)}
      />

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => onFiltersChange(DEFAULT_WP_FILTERS)}
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
          {label}
          {selected.length > 0 && (
            <Badge className="ml-1 h-4 px-1 text-[10px]">{selected.length}</Badge>
          )}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
        {options.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt}
            checked={selected.includes(opt)}
            onCheckedChange={() => onToggle(opt)}
          >
            {opt}
          </DropdownMenuCheckboxItem>
        ))}
        {options.length === 0 && (
          <div className="px-3 py-2 text-xs text-[hsl(var(--text-tertiary))]">No options</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/written-products/written-product-filter-bar.tsx
git commit -m "feat: add WrittenProductFilterBar component"
```

---

## Task 10: Export button

**Files:**
- Create: `components/written-products/written-product-export-button.tsx`

> **Note:** Reuses the existing `/api/export/google-sheet` endpoint — no new API route needed.

- [ ] **Step 1: Create the file**

```tsx
// components/written-products/written-product-export-button.tsx
'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WrittenProduct } from '@/lib/types';

type Field = keyof Omit<WrittenProduct, 'rowIndex'>;

const ALL_FIELDS: Field[] = [
  'textLink', 'country', 'cityDestination', 'state', 'tourType',
  'ccOk', 'isOk', 'rrOk', 'ssOk', 'contentExist', 'b2b', 'b2c', 'ssNotes',
];

const LABELS: Record<Field, string> = {
  textLink: 'Text Link',
  country: 'Country',
  cityDestination: 'City / Destination',
  state: 'State',
  tourType: 'Tour Type',
  ccOk: 'CC OK',
  isOk: 'IS OK',
  rrOk: 'RR OK',
  ssOk: 'SS OK',
  contentExist: 'Content Exist',
  b2b: 'B2B',
  b2c: 'B2C',
  ssNotes: 'SS Notes',
};

function getCellValue(product: WrittenProduct, field: Field): string {
  const v = product[field];
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return v ?? '';
}

interface WrittenProductExportButtonProps {
  products: WrittenProduct[];
}

export function WrittenProductExportButton({ products }: WrittenProductExportButtonProps) {
  const [exportingToSheets, setExportingToSheets] = useState(false);

  async function exportToGoogleSheets() {
    setExportingToSheets(true);
    const toastId = toast.loading('Creating Google Sheet…');
    try {
      const fields = ALL_FIELDS.map((f) => LABELS[f]);
      const rows = products.map((p) => ALL_FIELDS.map((f) => getCellValue(p, f)));
      const title = `Written Products export ${new Date().toISOString().slice(0, 10)}`;
      const res = await fetch('/api/export/google-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, fields, rows }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      toast.success('Sheet created', {
        id: toastId,
        action: { label: 'Open', onClick: () => window.open(url, '_blank') },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed', { id: toastId });
    } finally {
      setExportingToSheets(false);
    }
  }

  function exportCsv() {
    const headers = ALL_FIELDS.map((f) => LABELS[f]);
    const rows = products.map((p) => ALL_FIELDS.map((f) => getCellValue(p, f)));
    const escape = (v: string) => (v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
    const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `written-products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-sm">
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={exportToGoogleSheets} disabled={exportingToSheets}>
          Export to Google Sheets
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={exportCsv}>
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/written-products/written-product-export-button.tsx
git commit -m "feat: add WrittenProductExportButton (Google Sheets + CSV)"
```

---

## Task 11: Main client component

**Files:**
- Create: `app/(app)/written-products/written-products-client.tsx`

- [ ] **Step 1: Create the file**

```tsx
// app/(app)/written-products/written-products-client.tsx
'use client';

import { useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { WrittenProduct } from '@/lib/types';
import { fetcher } from '@/lib/fetcher';
import { WrittenProductTable } from '@/components/written-products/written-product-table';
import { WrittenProductDetailSheet } from '@/components/written-products/written-product-detail-sheet';
import {
  WrittenProductFilterBar,
  DEFAULT_WP_FILTERS,
  type WrittenProductFilters,
} from '@/components/written-products/written-product-filter-bar';
import { WrittenProductExportButton } from '@/components/written-products/written-product-export-button';
import { WrittenProductForm } from '@/components/written-products/written-product-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function WrittenProductsClient() {
  const { data: products, isLoading, error } = useSWR<WrittenProduct[]>(
    '/api/written-products',
    fetcher,
  );
  const { mutate } = useSWRConfig();

  const [filters, setFilters] = useState<WrittenProductFilters>(DEFAULT_WP_FILTERS);
  const [editProduct, setEditProduct] = useState<WrittenProduct | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<WrittenProduct | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const search = filters.search.toLowerCase();
    return products.filter((p) => {
      if (filters.countries.length > 0 && !filters.countries.includes(p.country)) return false;
      if (filters.tourTypes.length > 0 && !filters.tourTypes.includes(p.tourType)) return false;
      if (
        search &&
        ![p.textLink, p.country, p.cityDestination].some((v) =>
          v?.toLowerCase().includes(search),
        )
      )
        return false;
      return true;
    });
  }, [products, filters]);

  async function handleCreate(data: Omit<WrittenProduct, 'rowIndex'>) {
    setIsCreating(true);
    try {
      const res = await fetch('/api/written-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      await mutate('/api/written-products');
      setCreateOpen(false);
      toast.success('Created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteProduct) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/written-products/${deleteProduct.rowIndex}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) throw new Error(await res.text());
      await mutate('/api/written-products');
      setDeleteProduct(null);
      toast.success('Deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  }

  function handleSaved(updated: WrittenProduct) {
    mutate(
      '/api/written-products',
      (current: WrittenProduct[] | undefined) =>
        current?.map((p) => (p.rowIndex === updated.rowIndex ? updated : p)),
      false,
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
        <h1 className="text-sm font-medium text-[hsl(var(--text-primary))]">
          Written Products
          {filteredProducts.length > 0 && (
            <span className="ml-2 text-[hsl(var(--text-tertiary))] font-normal">
              ({filteredProducts.length})
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          <WrittenProductExportButton products={filteredProducts} />
          <Button size="sm" className="h-8 gap-1.5 text-sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>

      <div className="px-4 py-2 border-b border-[hsl(var(--border))]">
        <WrittenProductFilterBar
          allProducts={products ?? []}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-40 text-sm text-[hsl(var(--text-tertiary))]">
            Loading…
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-40 text-sm text-destructive">
            Failed to load: {(error as Error).message}
          </div>
        )}
        {!isLoading && !error && (
          <WrittenProductTable
            products={filteredProducts}
            onEdit={setEditProduct}
            onDelete={setDeleteProduct}
          />
        )}
      </div>

      <WrittenProductDetailSheet
        product={editProduct}
        onClose={() => setEditProduct(null)}
        onSaved={handleSaved}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Written Product</DialogTitle>
          </DialogHeader>
          <WrittenProductForm
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            isSubmitting={isCreating}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteProduct !== null}
        onOpenChange={(open) => !open && setDeleteProduct(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteProduct?.textLink}&rdquo; will be permanently removed from the sheet.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/written-products/written-products-client.tsx"
git commit -m "feat: add WrittenProductsClient main page component"
```

---

## Task 12: Page files

**Files:**
- Create: `app/(app)/written-products/page.tsx`
- Create: `app/(app)/written-products/loading.tsx`
- Create: `components/written-products/written-product-detail-page.tsx`
- Create: `app/(app)/written-products/[rowIndex]/page.tsx`

- [ ] **Step 1: Create `app/(app)/written-products/page.tsx`**

```tsx
// app/(app)/written-products/page.tsx
import { Suspense } from 'react';
import { WrittenProductsClient } from './written-products-client';

export default function WrittenProductsPage() {
  return (
    <Suspense fallback={null}>
      <WrittenProductsClient />
    </Suspense>
  );
}
```

- [ ] **Step 2: Create `app/(app)/written-products/loading.tsx`**

```tsx
// app/(app)/written-products/loading.tsx
export default function WrittenProductsLoading() {
  return (
    <div className="flex items-center justify-center h-40 text-sm text-[hsl(var(--text-tertiary))]">
      Loading…
    </div>
  );
}
```

- [ ] **Step 3: Create `components/written-products/written-product-detail-page.tsx`**

This is the client component for the full-page edit view (used when navigating directly to `/written-products/[rowIndex]`):

```tsx
// components/written-products/written-product-detail-page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { WrittenProductForm } from './written-product-form';
import type { WrittenProduct } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface WrittenProductDetailPageProps {
  product: WrittenProduct;
}

export function WrittenProductDetailPage({ product }: WrittenProductDetailPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: Omit<WrittenProduct, 'rowIndex'>) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/written-products/${product.rowIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Saved');
      router.push('/written-products');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 gap-1.5 text-sm"
        onClick={() => router.push('/written-products')}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </Button>
      <h1 className="text-sm font-medium mb-6 text-[hsl(var(--text-primary))] truncate">
        {product.textLink || 'Edit Written Product'}
      </h1>
      <WrittenProductForm
        initialData={product}
        onSubmit={handleSubmit}
        onCancel={() => router.push('/written-products')}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
```

- [ ] **Step 4: Create `app/(app)/written-products/[rowIndex]/page.tsx`**

```tsx
// app/(app)/written-products/[rowIndex]/page.tsx
export const dynamic = 'force-dynamic';

import 'server-only';
import { notFound } from 'next/navigation';
import { requireGoogleAccessToken } from '@/lib/google-session';
import { fetchAllWrittenProductRows } from '@/lib/written-products-sheets';
import { rowToWrittenProduct } from '@/lib/written-products-utils';
import { WrittenProductDetailPage } from '@/components/written-products/written-product-detail-page';

export default async function WrittenProductPage({
  params,
}: {
  params: Promise<{ rowIndex: string }>;
}) {
  const { rowIndex: rowIndexStr } = await params;
  const rowIndex = parseInt(rowIndexStr, 10);
  if (isNaN(rowIndex) || rowIndex < 2) notFound();

  const accessToken = await requireGoogleAccessToken();
  const rows = await fetchAllWrittenProductRows(accessToken);
  const row = rows[rowIndex - 1];
  if (!row) notFound();

  return <WrittenProductDetailPage product={rowToWrittenProduct(row, rowIndex)} />;
}
```

- [ ] **Step 5: Verify lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/written-products/page.tsx" \
        "app/(app)/written-products/loading.tsx" \
        "components/written-products/written-product-detail-page.tsx" \
        "app/(app)/written-products/[rowIndex]/page.tsx"
git commit -m "feat: add written products page files and detail page"
```

---

## Task 13: Sidebar navigation + environment variable

**Files:**
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Add `WRITTEN_PRODUCTS_SPREADSHEET_ID` to your `.env.local`**

Open `.env.local` (or wherever your local env vars live) and add:

```env
WRITTEN_PRODUCTS_SPREADSHEET_ID=<your_google_sheets_document_id>
```

The document ID is the long string in the Google Sheets URL between `/d/` and `/edit`.

- [ ] **Step 2: Update `components/layout/sidebar.tsx` — add import and nav item**

In the import line at the top, add `FileText` to the lucide-react import:

```ts
import { LayoutDashboard, Layers, Package, Settings, BookOpen, Share2, FileText } from 'lucide-react';
```

Then in `navItems`, insert the new entry after the `Products` item:

```ts
const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/written-products', label: 'Written Products', icon: FileText },
  { href: '/assembly', label: 'Assembly Line', icon: Layers },
  { href: '/sources', label: 'Sources', icon: BookOpen },
  { href: '/shareables', label: 'Shareables', icon: Share2 },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;
```

- [ ] **Step 3: Verify lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/layout/sidebar.tsx
git commit -m "feat: add Written Products nav item to sidebar"
```

---

## Task 14: Full build verification + manual smoke test

- [ ] **Step 1: Run production build**

```bash
npm run build
```

Expected: exits 0 with no TypeScript errors. Warns are OK; errors are not.

- [ ] **Step 2: Start dev server**

```bash
npm run dev
```

Open `http://localhost:3000`.

- [ ] **Step 3: Manual smoke test checklist**

- [ ] "Written Products" appears in the sidebar
- [ ] Clicking it navigates to `/written-products`
- [ ] Page loads and shows the table (or a loading state while SWR fetches)
- [ ] Rows from the Google Sheet appear
- [ ] Search input filters rows by textLink / country / city
- [ ] Country dropdown filters correctly
- [ ] Tour Type dropdown filters correctly
- [ ] "Clear" resets all filters
- [ ] Clicking the pencil icon opens the slide-in detail sheet
- [ ] Editing fields and saving updates the row in Google Sheets
- [ ] Clicking the trash icon shows the delete confirmation dialog
- [ ] Confirming delete removes the row from the sheet
- [ ] Clicking "Add" opens the create dialog
- [ ] Filling the form and saving appends a new row
- [ ] Export → CSV downloads a CSV file
- [ ] Export → Google Sheets creates a new spreadsheet in the user's Drive

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete Written Products page with full CRUD, filters, and export"
```
