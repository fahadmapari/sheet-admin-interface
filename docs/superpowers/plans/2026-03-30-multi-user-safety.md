# Multi-User Safety & Live Awareness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent silent data corruption from row-shifts and full-form save overwrites, and add 30-second background refresh so users see each other's changes.

**Architecture:** Add a `findRowByProductName` helper to `lib/sheets.ts` that resolves a product's current row by scanning the link column (col F) for a title match. PATCH and PUT in the API route use this to write to the correct row even after deletes shift rows; PUT additionally fetches the current row and merges submitted values over it instead of blindly overwriting. SWR polling is enabled with a 30-second interval.

**Tech Stack:** Next.js App Router, Google Sheets API v4 (googleapis), SWR, TypeScript

---

## File Map

| File | Change |
|---|---|
| `lib/sheets.ts` | Add `findRowByProductName(title)` |
| `app/api/products/[rowIndex]/route.ts` | Guard PATCH with identity check; change PUT to read-merge-write |
| `components/products/inline-edit-cell.tsx` | Pass `expectedLinkTitle` in PATCH body (two places: `InlineEditCell.save` and `LinkEditCell.save`) |
| `components/products/product-detail-tabs.tsx` | Handle 404 response on PUT; import `useSWRConfig` |
| `app/products/products-client.tsx` | Add `refreshInterval: 30_000` to `useSWR` |

---

## Task 1: Add `findRowByProductName` to lib/sheets.ts

**Files:**
- Modify: `lib/sheets.ts`

- [ ] **Step 1: Add the import for parseLinkField**

Open `lib/sheets.ts`. Add this import after the existing `import 'server-only'` line:

```ts
import { parseLinkField } from '@/lib/utils';
```

`lib/utils.ts` only imports from `clsx`, `tailwind-merge`, and `@/lib/types` — no circular dependency.

- [ ] **Step 2: Add the helper function**

Add this function at the end of `lib/sheets.ts`, after `batchUpdateRows`:

```ts
/**
 * Scan column F (link column, 0-based index 5) to find the row whose link title
 * matches the given string. Returns the 1-based rowIndex, or null if not found.
 * Title is the text portion of a `title||url` or plain-text cell value.
 */
export async function findRowByProductName(title: string): Promise<number | null> {
  if (!title) return null;
  const sheets = getSheetsClient();
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${NET_RATES_SHEET}'!F2:F`,
    });
    const values = response.data.values ?? [];
    for (let i = 0; i < values.length; i++) {
      const cell = String(values[i]?.[0] ?? '');
      const { text } = parseLinkField(cell);
      if (text === title) {
        return i + 2; // i=0 → sheet row 2 (first data row)
      }
    }
    return null;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to find row by product name "${title}": ${message}`);
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit
```

Expected: no errors related to `lib/sheets.ts` or `lib/utils.ts`.

- [ ] **Step 4: Commit**

```bash
git add lib/sheets.ts
git commit -m "feat: add findRowByProductName to sheets.ts for row-identity resolution"
```

---

## Task 2: Guard PATCH with identity check

**Files:**
- Modify: `app/api/products/[rowIndex]/route.ts`

- [ ] **Step 1: Add `findRowByProductName` to the import**

The existing import in `route.ts` is:

```ts
import { updateRow, updateCell, updateCellHyperlink, deleteRow } from '@/lib/sheets';
```

Change it to:

```ts
import { updateRow, updateCell, updateCellHyperlink, deleteRow, findRowByProductName, fetchRow } from '@/lib/sheets';
```

(`fetchRow` is needed for Task 3.)

- [ ] **Step 2: Update the PATCH handler**

Replace the entire `PATCH` function with:

```ts
export async function PATCH(req: NextRequest, { params }: Params) {
  const rowIndex = parseInt(params.rowIndex, 10);
  if (isNaN(rowIndex) || rowIndex < 2) {
    return NextResponse.json({ error: 'Invalid rowIndex' }, { status: 400 });
  }
  try {
    const body = await req.json() as { field: string; value: string; expectedLinkTitle?: string };
    const colIndex = FIELD_TO_COL[body.field as keyof typeof FIELD_TO_COL];
    if (colIndex === undefined) {
      return NextResponse.json({ error: `Unknown field: ${body.field}` }, { status: 400 });
    }

    // Resolve real row index unless the link field itself is being changed
    // (when editing the link, the title is changing so we can't use it for identity)
    let targetRowIndex = rowIndex;
    if (body.field !== 'link' && body.expectedLinkTitle) {
      const foundRow = await findRowByProductName(body.expectedLinkTitle);
      if (foundRow === null) {
        return NextResponse.json({ error: 'product_not_found' }, { status: 404 });
      }
      targetRowIndex = foundRow;
    }

    if (body.field === 'link') {
      const { text, url } = parseLinkField(body.value ?? '');
      await updateCellHyperlink(targetRowIndex, colIndex, text, url);
    } else {
      await updateCell(targetRowIndex, colIndex, body.value);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/products/[rowIndex]/route.ts
git commit -m "feat: guard PATCH with row-identity check via link title"
```

---

## Task 3: Change PUT to read-merge-write

**Files:**
- Modify: `app/api/products/[rowIndex]/route.ts`

- [ ] **Step 1: Update the PUT handler**

Replace the entire `PUT` function with:

```ts
export async function PUT(req: NextRequest, { params }: Params) {
  const rowIndex = parseInt(params.rowIndex, 10);
  if (isNaN(rowIndex) || rowIndex < 2) {
    return NextResponse.json({ error: 'Invalid rowIndex' }, { status: 400 });
  }
  try {
    const body = await req.json() as Omit<TourProduct, 'rowIndex'>;

    // Resolve real row index using the link title as the identity anchor
    const linkTitle = parseLinkField(body.link ?? '').text;
    let targetRowIndex = rowIndex;
    if (linkTitle) {
      const foundRow = await findRowByProductName(linkTitle);
      if (foundRow === null) {
        return NextResponse.json({ error: 'product_not_found' }, { status: 404 });
      }
      targetRowIndex = foundRow;
    }

    // Fetch the current row so we don't blank out fields not covered by this form save
    const currentRow = await fetchRow(targetRowIndex);
    while (currentRow.length < 70) currentRow.push('');

    // Build the row from submitted body, then merge: prefer submitted non-empty values,
    // keep current sheet value for any field the form left blank
    const submittedRow = productToRow(body);
    const mergedRow = currentRow.map((currentVal, i) => {
      const submitted = submittedRow[i] ?? '';
      return submitted !== '' ? submitted : currentVal;
    });

    await updateRow(targetRowIndex, mergedRow);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/products/[rowIndex]/route.ts
git commit -m "feat: change PUT to read-merge-write to prevent concurrent edit overwrites"
```

---

## Task 4: Pass `expectedLinkTitle` in inline cell PATCH body

**Files:**
- Modify: `components/products/inline-edit-cell.tsx`

- [ ] **Step 1: Verify `parseLinkField` is already imported**

Check line 24 of `inline-edit-cell.tsx`:

```ts
import { cn, parseLinkField } from '@/lib/utils';
```

It is — no import change needed.

- [ ] **Step 2: Update `InlineEditCell.save` to include `expectedLinkTitle`**

Find the `fetch` call inside the `save` callback of `InlineEditCell` (around line 285). Change the `body` value from:

```ts
body: JSON.stringify({ field, value: valueToSave }),
```

To:

```ts
body: JSON.stringify({
  field,
  value: valueToSave,
  expectedLinkTitle: parseLinkField(product.link ?? '').text,
}),
```

- [ ] **Step 3: Update `LinkEditCell.save` to include `expectedLinkTitle`**

Find the `fetch` call inside the `save` callback of `LinkEditCell` (around line 87). Change the `body` value from:

```ts
body: JSON.stringify({ field, value: combined }),
```

To:

```ts
body: JSON.stringify({
  field,
  value: combined,
  expectedLinkTitle: parseLinkField(product.link ?? '').text,
}),
```

Note: `LinkEditCell` already has `product` and `field` in its props, and `parseLinkField` is imported at the top of the file — no extra import needed.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/products/inline-edit-cell.tsx
git commit -m "feat: pass expectedLinkTitle in PATCH body for row-identity verification"
```

---

## Task 5: Handle 404 on PUT in product-detail-tabs.tsx

**Files:**
- Modify: `components/products/product-detail-tabs.tsx`

- [ ] **Step 1: Add `useSWRConfig` import**

Add to the imports at the top of `product-detail-tabs.tsx`:

```ts
import { useSWRConfig } from 'swr';
```

- [ ] **Step 2: Destructure `mutate` inside `ProductDetailClient`**

At the top of the `ProductDetailClient` function body, after the `useForm` call, add:

```ts
const { mutate } = useSWRConfig();
```

- [ ] **Step 3: Update the `onSubmit` 404 handler**

Find the `onSubmit` function. The current error block is:

```ts
toast.error('Failed to save product');
```

Replace the entire block after `if (res.ok) { ... }` with:

```ts
if (res.status === 404) {
  toast.error('Product not found — it may have been deleted. Refreshing list...');
  mutate('/api/products');
  return;
}
toast.error('Failed to save product');
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/products/product-detail-tabs.tsx
git commit -m "feat: handle 404 on PUT in product detail form"
```

---

## Task 6: Add SWR polling

**Files:**
- Modify: `app/products/products-client.tsx`

- [ ] **Step 1: Add `refreshInterval` to the SWR call**

Find the `useSWR` call (around line 61):

```ts
const { data: products, error, isLoading } = useSWR<TourProduct[]>('/api/products', fetcher, {
  dedupingInterval: 60_000,
});
```

Change to:

```ts
const { data: products, error, isLoading } = useSWR<TourProduct[]>('/api/products', fetcher, {
  dedupingInterval: 60_000,
  refreshInterval: 30_000,
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/products/products-client.tsx
git commit -m "feat: add 30s SWR polling for live awareness"
```

---

## Task 7: End-to-end manual verification

- [ ] **Step 1: Start the dev server**

```bash
cd e:/projects/sheet-admin && npm run dev
```

- [ ] **Step 2: Verify row-shift protection**

1. Open the products list in two browser tabs (Tab A, Tab B)
2. In Tab A, note the `rowIndex` and link title of a product near the bottom of the list
3. In Tab B, delete a product that comes BEFORE the product from step 2 (this shifts its row)
4. In Tab A (without refreshing), inline-edit any field on the product from step 2
5. Expected: the save succeeds and writes to the correct row (the shifted one), not the stale `rowIndex`
6. Verify in Google Sheets directly that the correct row was updated

- [ ] **Step 3: Verify PUT merge protection**

1. Open the product detail form (PUT path) in Tab A — note the value of a field like `notes`
2. In Tab B, inline-edit that same `notes` field to a new value and save
3. Back in Tab A (do NOT refresh), change a different field (e.g. `city`) and click Save
4. Expected: the PUT saves `city` correctly AND preserves the `notes` change from Tab B
5. Verify in Google Sheets

- [ ] **Step 4: Verify 404 on deleted product**

1. Open the product detail form for a product in Tab A
2. In Tab B, delete that product
3. In Tab A, change a field and click Save
4. Expected: toast error "Product not found — it may have been deleted. Refreshing list..."
5. The product list in Tab A refreshes and the deleted product is gone

- [ ] **Step 5: Verify 30-second polling**

1. Open the products list in Tab A
2. In Tab B (or directly in Google Sheets), change a cell value
3. Wait ~35 seconds in Tab A without any interaction
4. Expected: the changed value appears in Tab A without a manual refresh

- [ ] **Step 6: Verify link-field edit still works**

1. Inline-edit the `link` field of a product (this is the field used for identity — its edit skips the identity check)
2. Expected: save succeeds, link updates correctly
