# Date Picker for Product Detail Sheet — Design Spec

**Date:** 2026-04-19

## Problem

When editing a product in the detail sheet, date fields (`dateOfDispatch`, `dateUploaded`) fall through to the default plain text input in `InlineEditCell`. Users must type dates manually with no calendar affordance.

## Goal

Render `<input type="date">` for date fields in inline edit mode so users get the browser's native date picker.

## Scope

- **In scope:** Edit mode in `inline-edit-cell.tsx`
- **Out of scope:** Read-only tab view (already uses `<input type="date">` correctly)

## Fields Affected

- `dateOfDispatch` — "Date of Dispatch"
- `dateUploaded` — "Date Uploaded"

## Design

### 1. Shared `DATE_FIELDS` constant

Move the `DATE_FIELDS` Set from `product-detail-tabs.tsx` into `lib/constants.ts` so both files can import it without duplication.

```ts
// lib/constants.ts
export const DATE_FIELDS = new Set(["dateOfDispatch", "dateUploaded"]);
```

Update `product-detail-tabs.tsx` to import from `lib/constants.ts` instead of defining it locally.

### 2. Date case in `InlineEditCell`

In the field-type switch inside `inline-edit-cell.tsx`, add a date case before the default text input:

```tsx
if (DATE_FIELDS.has(field)) {
  return (
    <input
      type="date"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={cn(inputClassName)} // same classes as existing Input
    />
  );
}
```

### 3. Data format

- Values are stored as strings in Google Sheets.
- `<input type="date">` reads and writes `YYYY-MM-DD`.
- If the stored value is already `YYYY-MM-DD`, no conversion needed.
- If the value is in another format (e.g. `DD/MM/YYYY`), add a normalize helper to convert before passing to the input and convert back on save.

## Files Changed

| File | Change |
|------|--------|
| `lib/constants.ts` | Add `DATE_FIELDS` export |
| `components/products/product-detail-tabs.tsx` | Import `DATE_FIELDS` from `lib/constants.ts` |
| `components/products/inline-edit-cell.tsx` | Add date field case using `<input type="date">` |

## Testing

- Open a product detail sheet, enter edit mode, and click a date field — browser date picker should appear.
- Select a date, save — value should persist correctly.
- Verify existing non-date fields are unaffected.
