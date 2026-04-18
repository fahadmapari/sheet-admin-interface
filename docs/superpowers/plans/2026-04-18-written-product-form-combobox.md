# Written Product Form — Combobox Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain `Input` for `country`, `cityDestination`, and `tourType` in the written product form (both Add and Edit) with a `ComboboxInput` that suggests existing values from the dataset while allowing free text.

**Architecture:** A new `ComboboxInput` UI component wraps `Popover` + `Command` around a plain `Input`. The `WrittenProductForm` receives a `suggestions` prop and renders `ComboboxInput` for the three target fields. `WrittenProductsClient` derives unique sorted values from the SWR `products` array and passes them down through both the Add sheet and `WrittenProductDetailSheet`.

**Tech Stack:** React, shadcn/ui (`Popover`, `Command`, `Input`), cmdk, SWR, TypeScript

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Create | `components/ui/combobox-input.tsx` | New controlled combobox component |
| Modify | `components/written-products/written-product-form.tsx` | Add `suggestions` prop; use `ComboboxInput` for 3 fields |
| Modify | `components/written-products/written-product-detail-sheet.tsx` | Accept and forward `suggestions` prop |
| Modify | `app/(app)/written-products/written-products-client.tsx` | Derive suggestions from `products`; pass to form and detail sheet |

---

## Task 1: Create `ComboboxInput` component

**Files:**
- Create: `components/ui/combobox-input.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/ui/combobox-input.tsx
'use client';

import { useRef, useState } from 'react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ComboboxInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

export function ComboboxInput({
  id,
  value,
  onChange,
  options,
  placeholder,
  className,
}: ComboboxInputProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter(
    (opt) => opt.toLowerCase().includes(value.toLowerCase()) && opt !== value,
  );

  function handleSelect(opt: string) {
    onChange(opt);
    setOpen(false);
    inputRef.current?.blur();
  }

  return (
    <Popover open={open && filtered.length > 0} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          ref={inputRef}
          id={id}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={cn('h-8 text-sm', className)}
          autoComplete="off"
        />
      </PopoverAnchor>
      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)]"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            <CommandGroup>
              {filtered.map((opt) => (
                <CommandItem key={opt} value={opt} onSelect={() => handleSelect(opt)}>
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `combobox-input.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/ui/combobox-input.tsx
git commit -m "feat: add ComboboxInput UI component"
```

---

## Task 2: Update `WrittenProductForm` to use `ComboboxInput`

**Files:**
- Modify: `components/written-products/written-product-form.tsx`

- [ ] **Step 1: Add `suggestions` prop and `ComboboxInput` import**

At the top of the file, add the import after the existing imports:

```tsx
import { ComboboxInput } from '@/components/ui/combobox-input';
```

Add `suggestions` to `WrittenProductFormProps`:

```tsx
interface WrittenProductFormProps {
  formId?: string;
  hideActions?: boolean;
  initialData?: FormData;
  existingTitles?: Set<string>;
  suggestions?: {
    country?: string[];
    cityDestination?: string[];
    tourType?: string[];
  };
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
  isSubmitting: boolean;
}
```

Update the function signature to destructure `suggestions`:

```tsx
export function WrittenProductForm({
  formId,
  hideActions,
  initialData,
  existingTitles,
  suggestions,
  onSubmit,
  onCancel,
  onDelete,
  isSubmitting,
}: WrittenProductFormProps) {
```

- [ ] **Step 2: Replace the 4-field grid with conditional rendering**

Replace the entire block that maps over `['country', 'cityDestination', 'state', 'tourType']` (lines ~93–113 in the original file):

```tsx
<div className="grid grid-cols-2 gap-4">
  {(
    [
      { key: 'country', label: 'Country' },
      { key: 'cityDestination', label: 'City / Destination' },
      { key: 'state', label: 'State' },
      { key: 'tourType', label: 'Tour Type' },
    ] as const
  ).map(({ key, label }) => {
    const opts =
      key === 'country' ? suggestions?.country :
      key === 'cityDestination' ? suggestions?.cityDestination :
      key === 'tourType' ? suggestions?.tourType :
      undefined;
    return (
      <div key={key} className="space-y-1">
        <Label htmlFor={key} className="text-sm">
          {label}
        </Label>
        {opts && opts.length > 0 ? (
          <ComboboxInput
            id={key}
            value={form[key]}
            onChange={(v) => setField(key, v)}
            options={opts}
          />
        ) : (
          <Input
            id={key}
            value={form[key]}
            onChange={(e) => setField(key, e.target.value)}
            className="h-8 text-sm"
          />
        )}
      </div>
    );
  })}
</div>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/written-products/written-product-form.tsx
git commit -m "feat: use ComboboxInput for country, city, tour type in written product form"
```

---

## Task 3: Thread `suggestions` through `WrittenProductDetailSheet`

**Files:**
- Modify: `components/written-products/written-product-detail-sheet.tsx`

- [ ] **Step 1: Add `suggestions` to the props interface**

Find `WrittenProductDetailSheetProps` and add:

```tsx
interface WrittenProductDetailSheetProps {
  product: WrittenProduct | null;
  inProducts: boolean;
  suggestions?: {
    country?: string[];
    cityDestination?: string[];
    tourType?: string[];
  };
  onClose: () => void;
  onSaved: (updated: WrittenProduct) => void;
  onDelete: (product: WrittenProduct) => void;
}
```

Update the function signature to destructure `suggestions`:

```tsx
export function WrittenProductDetailSheet({
  product,
  inProducts,
  suggestions,
  onClose,
  onSaved,
  onDelete,
}: WrittenProductDetailSheetProps) {
```

- [ ] **Step 2: Forward `suggestions` to `WrittenProductForm`**

Find the `<WrittenProductForm>` inside the detail view (the one with `formId={FORM_ID}`) and add the prop:

```tsx
<WrittenProductForm
  formId={FORM_ID}
  hideActions
  initialData={product}
  suggestions={suggestions}
  onSubmit={handleSubmit}
  onCancel={onClose}
  onDelete={() => onDelete(product)}
  isSubmitting={isSubmitting}
/>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/written-products/written-product-detail-sheet.tsx
git commit -m "feat: forward suggestions prop through WrittenProductDetailSheet"
```

---

## Task 4: Derive suggestions in `WrittenProductsClient` and pass them down

**Files:**
- Modify: `app/(app)/written-products/written-products-client.tsx`

- [ ] **Step 1: Add the `suggestions` memo**

After the existing `existingTitles` memo (around line 136), add:

```tsx
const suggestions = useMemo(() => {
  if (!products) return {};
  function unique(key: 'country' | 'cityDestination' | 'tourType') {
    return [
      ...new Set(
        products
          .map((p) => p[key])
          .filter((v): v is string => Boolean(v)),
      ),
    ].sort();
  }
  return {
    country: unique('country'),
    cityDestination: unique('cityDestination'),
    tourType: unique('tourType'),
  };
}, [products]);
```

- [ ] **Step 2: Pass `suggestions` to the Add form**

Find the `<WrittenProductForm>` inside the Add `<Sheet>` and add the prop:

```tsx
<WrittenProductForm
  key={String(createOpen)}
  formId="add-written-product-form"
  hideActions
  suggestions={suggestions}
  onSubmit={handleCreate}
  onCancel={() => setCreateOpen(false)}
  isSubmitting={isCreating}
  existingTitles={existingTitles}
/>
```

- [ ] **Step 3: Pass `suggestions` to `WrittenProductDetailSheet`**

Find the `<WrittenProductDetailSheet>` render and add the prop:

```tsx
<WrittenProductDetailSheet
  product={editProduct}
  inProducts={
    editProduct
      ? productTitlesSet.has(parseLinkField(editProduct.textLink ?? '').text.toLowerCase())
      : false
  }
  suggestions={suggestions}
  onClose={() => setEditProduct(null)}
  onSaved={handleSaved}
  onDelete={(p) => { setEditProduct(null); setDeleteProduct(p); }}
/>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/(app)/written-products/written-products-client.tsx
git commit -m "feat: derive and pass field suggestions to written product forms"
```

---

## Task 5: Manual verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Navigate to `http://localhost:3000/written-products`.

- [ ] **Step 2: Test Add form**

Click **Add**. Click into the **Country** field — it should show a dropdown of existing country values. Type a partial value (e.g. "Eg") — the list should filter to matching entries. Click an entry — the field should populate. Type a brand new value not in the list — it should be accepted without error.

Repeat the same checks for **City / Destination** and **Tour Type**.

- [ ] **Step 3: Test Edit form**

Click any row to open the detail sheet. Verify the same combo box behavior for Country, City, and Tour Type.

- [ ] **Step 4: Verify State field is still a plain input**

The **State** field should remain a plain `<Input>` (no dropdown).

- [ ] **Step 5: Run lint**

```bash
npm run lint
```

Expected: no new errors.
