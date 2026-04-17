# Design: Add Written Product to Products Sheet

**Date:** 2026-04-18  
**Status:** Approved

## Overview

Add an "Add to Products" button inside `WrittenProductDetailSheet` that opens the existing `ProductForm` pre-filled with data from the written product. This lets users promote a written product entry into the main Products sheet without re-entering shared fields.

## Architecture

Two files change:

1. **`components/products/product-form.tsx`** — add an optional `defaultValues` prop
2. **`components/written-products/written-product-detail-sheet.tsx`** — add the button and manage `ProductForm` open state

No new files. No API changes.

## Component Changes

### `ProductForm`

Add two new optional props:

```ts
interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  defaultValues?: Partial<FormData>; // new — pre-fills fields on open
  written?: boolean;                 // new — merged into POST body
}
```

Replace the existing `useEffect` that resets the form:

```ts
// before
useEffect(() => {
  if (!open) reset();
}, [open, reset]);

// after
useEffect(() => {
  if (open) {
    reset(defaultValues ?? {});
  } else {
    reset({});
  }
}, [open, reset]); // defaultValues intentionally omitted — snapshot on open only
```

In `onSubmit`, merge the `written` flag into the POST body:

```ts
body: JSON.stringify({ ...rest, link, ...(written ? { written: true } : {}) }),
```

### `WrittenProductDetailSheet`

1. Import `ProductForm` and `useState`.
2. Add `addProductOpen` boolean state.
3. Add an "Add to Products" button in the sheet header (small outline button, `Plus` icon).
4. Build `defaultValues` from the written product when the button is clicked:

```ts
function buildProductDefaults(wp: WrittenProduct): Partial<FormData> {
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

5. Render `<ProductForm open={addProductOpen} onClose={...} defaultValues={...} />` at the bottom of the component.

## Data Flow

| WrittenProduct field | ProductForm field | Transformation |
|---|---|---|
| `country` | `country` | direct |
| `cityDestination` | `city` | rename |
| `tourType` | `productType` | rename |
| `textLink` | `linkTitle` + `linkUrl` | `parseLinkField` split |

Fields with no mapping (`state`, boolean flags) are left blank for the user.

The `written: true` flag is merged into the POST body inside `ProductForm.onSubmit` so the created product is immediately marked as having written content.

## UX / Interaction

- "Add to Products" button sits in the `SheetHeader`, right-aligned, styled as a small outline button with a `Plus` icon.
- Clicking opens `ProductForm` as a new Sheet layered on top. The detail sheet remains open underneath.
- On success: `toast.success('Product added')` fires (already in `ProductForm`), the product form sheet closes, and the detail sheet stays open.
- On cancel: product form sheet closes, detail sheet stays open.

## Out of Scope

- No changes to the written products table row actions.
- No automatic sync or linking between the written product record and the newly created product.
- No changes to any API route.
