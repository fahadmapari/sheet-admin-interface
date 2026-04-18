---
title: Written Product Form — Combobox Fields
date: 2026-04-18
status: approved
---

## Goal

Replace the plain text inputs for `country`, `city/destination`, and `tour type` in the written product form (both Add and Edit) with combo boxes: inputs that suggest existing values from the dataset while still allowing free text entry.

## Components

### `components/ui/combobox-input.tsx` (new)

A controlled combobox built on the existing `Popover` + `Command` shadcn primitives.

**Props:**
```ts
interface ComboboxInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];       // suggestions to show in dropdown
  placeholder?: string;
  className?: string;
}
```

**Behavior:**
- Renders a standard `Input` element (matches existing form styling: `h-8 text-sm`)
- On focus or keystroke, opens a `Popover` anchored below the input
- The `Command` list filters `options` by the current input value (case-insensitive substring match)
- Selecting an item sets the value and closes the popover
- Typing freely always allowed — the user is never forced to pick from the list
- Popover closes on outside click or Escape
- If no options match the typed value, the dropdown is hidden (not shown empty)

### `components/written-products/written-product-form.tsx` (modified)

Add optional `suggestions` prop:
```ts
suggestions?: {
  country?: string[];
  cityDestination?: string[];
  tourType?: string[];
}
```

- `country`, `cityDestination`, `tourType` fields render `ComboboxInput` when the corresponding suggestions array is non-empty, otherwise fall back to plain `Input`
- No change to form submission logic or other fields

### `components/written-products/written-product-detail-sheet.tsx` (modified)

Add `suggestions` prop (same shape as above) and forward it to `WrittenProductForm`.

### `app/(app)/written-products/written-products-client.tsx` (modified)

Derive unique sorted suggestion arrays from the `products` SWR data:

```ts
const suggestions = useMemo(() => ({
  country: unique(products, 'country'),
  cityDestination: unique(products, 'cityDestination'),
  tourType: unique(products, 'tourType'),
}), [products]);
```

Where `unique` extracts non-empty, deduplicated, sorted string values.

Pass `suggestions` to:
1. The `WrittenProductForm` inside the Add sheet
2. `WrittenProductDetailSheet`

## Data Flow

```
WrittenProductsClient (has products SWR data)
  → derives suggestions (country[], cityDestination[], tourType[])
  → Add Sheet → WrittenProductForm (suggestions prop)
  → WrittenProductDetailSheet (suggestions prop) → WrittenProductForm (suggestions prop)
```

## Edge Cases

- If `products` is still loading, suggestions will be empty — fields degrade to plain inputs, which is acceptable
- Values already in the field (edit mode) are preserved; the combobox just augments with suggestions
- Duplicate or empty values are excluded from suggestions
