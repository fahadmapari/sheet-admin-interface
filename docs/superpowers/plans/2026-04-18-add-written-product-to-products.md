# Add Written Product to Products Sheet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Add to Products" button in the `WrittenProductDetailSheet` that opens the existing `ProductForm` pre-filled with the written product's fields.

**Architecture:** Extend `ProductForm` with two optional props (`defaultValues`, `written`) so it can be driven with pre-filled data, then wire up `WrittenProductDetailSheet` to open it with mapped fields from the current written product.

**Tech Stack:** Next.js 16, TypeScript, React Hook Form, Zod, SWR, shadcn/ui, Lucide icons, Sonner toasts.

---

## File Map

| File | Change |
|------|--------|
| `components/products/product-form.tsx` | Add `defaultValues` and `written` props; update `useEffect` and `onSubmit` |
| `components/written-products/written-product-detail-sheet.tsx` | Add `addProductOpen` state, `buildProductDefaults` helper, button in header, `ProductForm` render |

---

## Task 1: Extend `ProductForm` with `defaultValues` and `written` props

**Files:**
- Modify: `components/products/product-form.tsx:172-228`

### Step 1: Update `ProductFormProps` interface and function signature

Replace lines 172–177 in `components/products/product-form.tsx`:

```ts
// BEFORE
interface ProductFormProps {
  open: boolean;
  onClose: () => void;
}

export function ProductForm({ open, onClose }: ProductFormProps) {
```

```ts
// AFTER
interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  defaultValues?: Partial<FormData>;
  written?: boolean;
}

export function ProductForm({ open, onClose, defaultValues, written }: ProductFormProps) {
```

- [ ] Make the edit above.

### Step 2: Update the `useEffect` to reset with defaults on open

Replace lines 205–209 in `components/products/product-form.tsx`:

```ts
// BEFORE
useEffect(() => {
  if (!open) {
    reset();
  }
}, [open, reset]);
```

```ts
// AFTER
useEffect(() => {
  if (open) {
    reset(defaultValues ?? {});
  } else {
    reset({});
  }
}, [open, reset]); // defaultValues intentionally omitted — snapshot on open only
```

- [ ] Make the edit above.

### Step 3: Update `onSubmit` to include `written` in the POST body

Replace lines 211–228 in `components/products/product-form.tsx`:

```ts
// BEFORE
const onSubmit = async (data: FormData) => {
  const { linkTitle, linkUrl, ...rest } = data;
  const link = `${linkTitle.trim()}||${linkUrl.trim()}`;

  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...rest, link }),
  });
  if (res.ok) {
    toast.success('Product added');
    mutate('/api/products');
    onClose();
    reset();
  } else {
    toast.error('Failed to add product');
  }
};
```

```ts
// AFTER
const onSubmit = async (data: FormData) => {
  const { linkTitle, linkUrl, ...rest } = data;
  const link = `${linkTitle.trim()}||${linkUrl.trim()}`;

  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...rest, link, ...(written ? { written: true } : {}) }),
  });
  if (res.ok) {
    toast.success('Product added');
    mutate('/api/products');
    onClose();
    reset();
  } else {
    toast.error('Failed to add product');
  }
};
```

- [ ] Make the edit above.

### Step 4: Verify TypeScript compiles

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit
```

Expected: no errors (or only pre-existing errors unrelated to these files).

- [ ] Run the command above and confirm no new errors.

### Step 5: Commit

```bash
cd e:/projects/sheet-admin
git add components/products/product-form.tsx
git commit -m "feat: add defaultValues and written props to ProductForm"
```

- [ ] Commit.

---

## Task 2: Wire up `WrittenProductDetailSheet`

**Files:**
- Modify: `components/written-products/written-product-detail-sheet.tsx`

### Step 1: Add new imports

Replace the import block at the top of `components/written-products/written-product-detail-sheet.tsx`:

```ts
// BEFORE
'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ExternalLink } from 'lucide-react';
import { WrittenProductForm } from './written-product-form';
import type { WrittenProduct } from '@/lib/types';
import { parseLinkField } from '@/lib/utils';
import { toast } from 'sonner';
```

```ts
// AFTER
'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ExternalLink, Plus } from 'lucide-react';
import { WrittenProductForm } from './written-product-form';
import { ProductForm } from '@/components/products/product-form';
import type { WrittenProduct } from '@/lib/types';
import { parseLinkField } from '@/lib/utils';
import { toast } from 'sonner';
```

- [ ] Make the edit above.

### Step 2: Add `buildProductDefaults` helper before the component

Insert this function after the import block and before the `WrittenProductDetailSheetProps` interface:

```ts
function buildProductDefaults(wp: WrittenProduct) {
  const { text, url } = parseLinkField(wp.textLink ?? '');
  return {
    country: wp.country ?? '',
    city: wp.cityDestination ?? '',
    productType: wp.tourType ?? '',
    linkTitle: text ?? '',
    linkUrl: url ?? '',
  };
}
```

- [ ] Make the edit above.

### Step 3: Add `addProductOpen` state inside the component

Inside `WrittenProductDetailSheet`, after the existing `const [isSubmitting, setIsSubmitting] = useState(false);` line, add:

```ts
const [addProductOpen, setAddProductOpen] = useState(false);
```

- [ ] Make the edit above.

### Step 4: Add "Add to Products" button in the sheet header

The current header is:

```tsx
<SheetHeader>
  <SheetTitle className="text-sm font-medium truncate pr-4">
    {product?.textLink ? (() => {
      const { text, url } = parseLinkField(product.textLink);
      const displayName = text || url || product.textLink;
      return (
        <span className="inline-flex items-center gap-1.5">
          {displayName}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))] transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </span>
      );
    })() : 'Edit Written Product'}
  </SheetTitle>
</SheetHeader>
```

Replace it with:

```tsx
<SheetHeader>
  <SheetTitle className="text-sm font-medium truncate pr-4">
    {product?.textLink ? (() => {
      const { text, url } = parseLinkField(product.textLink);
      const displayName = text || url || product.textLink;
      return (
        <span className="inline-flex items-center gap-1.5">
          {displayName}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))] transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </span>
      );
    })() : 'Edit Written Product'}
  </SheetTitle>
  {product && (
    <Button
      variant="outline"
      size="sm"
      className="h-7 text-xs gap-1 self-start"
      onClick={() => setAddProductOpen(true)}
    >
      <Plus className="h-3.5 w-3.5" />
      Add to Products
    </Button>
  )}
</SheetHeader>
```

- [ ] Make the edit above.

### Step 5: Render `ProductForm` outside the Sheet

The current `return` statement wraps everything in a single `<Sheet>`. Wrap the return in a fragment and add `<ProductForm>` after the closing `</Sheet>`:

```tsx
// BEFORE
return (
  <Sheet open={product !== null} onOpenChange={(open) => !open && onClose()}>
    <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
      ...
    </SheetContent>
  </Sheet>
);
```

```tsx
// AFTER
return (
  <>
    <Sheet open={product !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        ...
      </SheetContent>
    </Sheet>
    {product && (
      <ProductForm
        open={addProductOpen}
        onClose={() => setAddProductOpen(false)}
        defaultValues={buildProductDefaults(product)}
        written
      />
    )}
  </>
);
```

- [ ] Make the edit above.

### Step 6: Verify TypeScript compiles

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit
```

Expected: no errors (or only pre-existing errors unrelated to these files).

- [ ] Run the command above and confirm no new errors.

### Step 7: Manual smoke test

```bash
cd e:/projects/sheet-admin && npm run dev
```

1. Navigate to the Written Products page.
2. Click a row to open the detail sheet.
3. Confirm "Add to Products" button appears below the product title.
4. Click "Add to Products" — a second sheet should open with `country`, `city`, `product type`, `link title`, and `link URL` pre-filled from the written product.
5. Submit the form — confirm `toast.success('Product added')` fires and the product form closes.
6. Navigate to the Products page and confirm the new product appears with `written` set to true (visible in the detail view or the sheet's "Written" field).

- [ ] Complete the smoke test above.

### Step 8: Commit

```bash
cd e:/projects/sheet-admin
git add components/written-products/written-product-detail-sheet.tsx
git commit -m "feat: add 'Add to Products' button to WrittenProductDetailSheet"
```

- [ ] Commit.
