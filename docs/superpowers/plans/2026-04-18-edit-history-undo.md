# Edit History & Undo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a session-scoped edit history (last 10 edits) with per-entry revert to the product table and written products table, surfaced via a Clock icon toolbar button that opens a popover.

**Architecture:** A `useEditHistory` hook holds an array of `EditRecord` objects (max 10) each with a `revertFn` closure that knows the correct API call. For product edits (cell-by-cell PATCH), `onSaveSuccess` is threaded through `InlineEditCell` → `ProductDetailSheet` → `ProductsClient`. For written product edits (whole-form PUT), `onSaveComplete` is added to `WrittenProductDetailSheet`. Each table client instantiates its own independent hook instance.

**Tech Stack:** React hooks, nanoid, date-fns, shadcn/ui Popover, lucide-react Clock icon, existing SWR mutate pattern.

---

## File Map

| Action | File |
|--------|------|
| Create | `lib/hooks/use-edit-history.ts` |
| Create | `components/ui/edit-history-popover.tsx` |
| Modify | `components/products/inline-edit-cell.tsx` |
| Modify | `components/products/product-detail-sheet.tsx` |
| Modify | `app/(app)/products/products-client.tsx` |
| Modify | `components/written-products/written-product-detail-sheet.tsx` |
| Modify | `app/(app)/written-products/written-products-client.tsx` |

---

## Task 1: Create `useEditHistory` hook

**Files:**
- Create: `lib/hooks/use-edit-history.ts`

- [ ] **Step 1: Write the hook**

```ts
// lib/hooks/use-edit-history.ts
import { useCallback, useState } from 'react';
import { nanoid } from 'nanoid';

export type EditRecord = {
  id: string;
  rowLabel: string;
  fieldLabel: string;
  oldValueDisplay: string;
  newValueDisplay: string;
  timestamp: number;
  revertFn: () => Promise<void>;
};

const MAX_HISTORY = 10;

export function useEditHistory() {
  const [history, setHistory] = useState<EditRecord[]>([]);

  const push = useCallback((record: Omit<EditRecord, 'id' | 'timestamp'>) => {
    const entry: EditRecord = { ...record, id: nanoid(), timestamp: Date.now() };
    setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
  }, []);

  const revert = useCallback(async (record: EditRecord) => {
    await record.revertFn();
    setHistory((prev) => prev.filter((r) => r.id !== record.id));
  }, []);

  return { history, push, revert };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build 2>&1 | head -30`
Expected: no errors referencing `use-edit-history.ts`

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/use-edit-history.ts
git commit -m "feat: add useEditHistory hook"
```

---

## Task 2: Create `EditHistoryPopover` component

**Files:**
- Create: `components/ui/edit-history-popover.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/ui/edit-history-popover.tsx
'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { EditRecord } from '@/lib/hooks/use-edit-history';

function truncate(str: string, max = 30): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

interface EditHistoryPopoverProps {
  history: EditRecord[];
  onRevert: (record: EditRecord) => Promise<void>;
}

export function EditHistoryPopover({ history, onRevert }: EditHistoryPopoverProps) {
  const [revertingId, setRevertingId] = useState<string | null>(null);

  async function handleRevert(record: EditRecord) {
    setRevertingId(record.id);
    try {
      await onRevert(record);
    } finally {
      setRevertingId(null);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-7 w-7 p-0"
          title="Edit history"
          aria-label="Edit history"
        >
          <Clock className="h-3.5 w-3.5" />
          {history.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] leading-none">
              {history.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b border-[hsl(var(--border))] px-4 py-3">
          <span className="text-sm font-medium">Edit History</span>
        </div>
        {history.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-[hsl(var(--text-secondary))]">
            No edits this session
          </p>
        ) : (
          <div className="divide-y divide-[hsl(var(--border))]">
            {history.map((record) => {
              const isReverting = revertingId === record.id;
              return (
                <div key={record.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-[hsl(var(--text-primary))]">
                        {record.rowLabel} · {record.fieldLabel}
                      </p>
                      <p className="mt-0.5 text-xs text-[hsl(var(--text-secondary))]">
                        <span>{truncate(record.oldValueDisplay)}</span>
                        <span className="mx-1 text-[hsl(var(--text-tertiary))]">→</span>
                        <span>{truncate(record.newValueDisplay)}</span>
                      </p>
                      <p className="mt-0.5 text-[10px] text-[hsl(var(--text-tertiary))]">
                        {formatDistanceToNow(record.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 shrink-0 px-2 text-xs"
                      disabled={isReverting}
                      onClick={() => handleRevert(record)}
                    >
                      {isReverting ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                      ) : (
                        'Revert'
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build 2>&1 | head -30`
Expected: no errors referencing `edit-history-popover.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/ui/edit-history-popover.tsx
git commit -m "feat: add EditHistoryPopover component"
```

---

## Task 3: Add `onSaveSuccess` to `InlineEditCell`

**Files:**
- Modify: `components/products/inline-edit-cell.tsx`

`InlineEditCell` has four save implementations: the main component (`InlineEditCell`) and three sub-components (`LinkEditCell`, `ImageLinksCell`, `ComboboxCell`). Each needs the same change: add `onSaveSuccess?` to props and call it after a successful API response.

- [ ] **Step 1: Add `onSaveSuccess` to `InlineEditCellProps`**

In `InlineEditCellProps` (line 41), change:
```ts
interface InlineEditCellProps {
  product: TourProduct;
  field: keyof Omit<TourProduct, 'rowIndex'>;
  onSaved: (field: string, value: string) => void;
  readOnly?: boolean;
}
```
To:
```ts
interface InlineEditCellProps {
  product: TourProduct;
  field: keyof Omit<TourProduct, 'rowIndex'>;
  onSaved: (field: string, value: string) => void;
  onSaveSuccess?: (field: string, oldValue: string, newValue: string) => void;
  readOnly?: boolean;
}
```

- [ ] **Step 2: Update `LinkEditCell.save` (around line 95)**

Change the `save` useCallback in `LinkEditCell` from:
```ts
    const save = useCallback(
    async (textVal: string, urlVal: string) => {
      if (!isMountedRef.current || savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      const combined = buildLinkField(textVal, urlVal);
      onSaved(field, combined);
      try {
        const res = await fetch(`/api/products/${product.rowIndex}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field,
            value: combined,
            expectedLinkTitle: parseLinkField(product.link ?? '').text,
          }),
        });
        if (!isMountedRef.current) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? `HTTP ${res.status}`);
        }
      } catch (err) {
        if (isMountedRef.current) {
          toast.error(`Failed to save: ${err instanceof Error ? err.message : String(err)}`);
          onSaved(field, strValue);
          const p = parseLinkField(strValue);
          setText(p.text);
          setUrl(p.url);
        }
      } finally {
        savingRef.current = false;
        if (isMountedRef.current) setSaving(false);
      }
    },
    [field, product.rowIndex, product.link, strValue, onSaved],
  );
```
To:
```ts
  const save = useCallback(
    async (textVal: string, urlVal: string) => {
      if (!isMountedRef.current || savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      const combined = buildLinkField(textVal, urlVal);
      onSaved(field, combined);
      try {
        const res = await fetch(`/api/products/${product.rowIndex}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field,
            value: combined,
            expectedLinkTitle: parseLinkField(product.link ?? '').text,
          }),
        });
        if (!isMountedRef.current) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? `HTTP ${res.status}`);
        }
        onSaveSuccess?.(field, strValue, combined);
      } catch (err) {
        if (isMountedRef.current) {
          toast.error(`Failed to save: ${err instanceof Error ? err.message : String(err)}`);
          onSaved(field, strValue);
          const p = parseLinkField(strValue);
          setText(p.text);
          setUrl(p.url);
        }
      } finally {
        savingRef.current = false;
        if (isMountedRef.current) setSaving(false);
      }
    },
    [field, product.rowIndex, product.link, strValue, onSaved, onSaveSuccess],
  );
```

- [ ] **Step 3: Update `ImageLinksCell.save` (around line 270)**

Change the `save` useCallback in `ImageLinksCell` from:
```ts
  const save = useCallback(
    async (valueToSave: string) => {
      if (!isMountedRef.current || savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      onSaved(field, valueToSave);
      try {
        const res = await fetch(`/api/products/${product.rowIndex}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field,
            value: valueToSave,
            expectedLinkTitle: parseLinkField(product.link ?? '').text,
          }),
        });
        if (!isMountedRef.current) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? `HTTP ${res.status}`);
        }
      } catch (err) {
        if (isMountedRef.current) {
          toast.error(`Failed to save: ${err instanceof Error ? err.message : String(err)}`);
          onSaved(field, strValue);
        }
      } finally {
        savingRef.current = false;
        if (isMountedRef.current) setSaving(false);
      }
    },
    [field, product.rowIndex, product.link, strValue, onSaved],
  );
```
To:
```ts
  const save = useCallback(
    async (valueToSave: string) => {
      if (!isMountedRef.current || savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      onSaved(field, valueToSave);
      try {
        const res = await fetch(`/api/products/${product.rowIndex}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field,
            value: valueToSave,
            expectedLinkTitle: parseLinkField(product.link ?? '').text,
          }),
        });
        if (!isMountedRef.current) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? `HTTP ${res.status}`);
        }
        onSaveSuccess?.(field, strValue, valueToSave);
      } catch (err) {
        if (isMountedRef.current) {
          toast.error(`Failed to save: ${err instanceof Error ? err.message : String(err)}`);
          onSaved(field, strValue);
        }
      } finally {
        savingRef.current = false;
        if (isMountedRef.current) setSaving(false);
      }
    },
    [field, product.rowIndex, product.link, strValue, onSaved, onSaveSuccess],
  );
```

- [ ] **Step 4: Update `ComboboxCell.save` (around line 576)**

Change the `save` useCallback in `ComboboxCell` from:
```ts
  const save = useCallback(
    async (valueToSave: string) => {
      if (!isMountedRef.current || savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      onSaved(field, valueToSave);
      try {
        const res = await fetch(`/api/products/${product.rowIndex}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field,
            value: valueToSave,
            expectedLinkTitle: parseLinkField(product.link ?? '').text,
          }),
        });
        if (!isMountedRef.current) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? `HTTP ${res.status}`);
        }
      } catch (err) {
        if (isMountedRef.current) {
          toast.error(`Failed to save: ${err instanceof Error ? err.message : String(err)}`);
          onSaved(field, strValue);
        }
      } finally {
        savingRef.current = false;
        if (isMountedRef.current) setSaving(false);
      }
    },
    [field, product.rowIndex, product.link, strValue, onSaved],
  );
```
To:
```ts
  const save = useCallback(
    async (valueToSave: string) => {
      if (!isMountedRef.current || savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      onSaved(field, valueToSave);
      try {
        const res = await fetch(`/api/products/${product.rowIndex}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field,
            value: valueToSave,
            expectedLinkTitle: parseLinkField(product.link ?? '').text,
          }),
        });
        if (!isMountedRef.current) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? `HTTP ${res.status}`);
        }
        onSaveSuccess?.(field, strValue, valueToSave);
      } catch (err) {
        if (isMountedRef.current) {
          toast.error(`Failed to save: ${err instanceof Error ? err.message : String(err)}`);
          onSaved(field, strValue);
        }
      } finally {
        savingRef.current = false;
        if (isMountedRef.current) setSaving(false);
      }
    },
    [field, product.rowIndex, product.link, strValue, onSaved, onSaveSuccess],
  );
```

- [ ] **Step 5: Update main `InlineEditCell.save` (around line 716)**

Change from:
```ts
  const save = useCallback(
    async (valueToSave: string) => {
      if (!isMountedRef.current) return;
      if (savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      onSaved(field, valueToSave);
      try {
        const res = await fetch(`/api/products/${product.rowIndex}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field,
            value: valueToSave,
            expectedLinkTitle: parseLinkField(product.link ?? '').text,
          }),
        });
        if (!isMountedRef.current) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? `HTTP ${res.status}`);
        }
      } catch (err) {
        if (isMountedRef.current) {
          const msg = err instanceof Error ? err.message : String(err);
          toast.error(`Failed to save: ${msg}`);
          onSaved(field, fieldValueToString(field, rawValue));
          setInputValue(fieldValueToString(field, rawValue));
        }
      } finally {
        savingRef.current = false;
        if (isMountedRef.current) setSaving(false);
      }
    },
    [field, product.rowIndex, product.link, rawValue, onSaved],
  );
```
To:
```ts
  const save = useCallback(
    async (valueToSave: string) => {
      if (!isMountedRef.current) return;
      if (savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      const oldValue = fieldValueToString(field, rawValue);
      onSaved(field, valueToSave);
      try {
        const res = await fetch(`/api/products/${product.rowIndex}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field,
            value: valueToSave,
            expectedLinkTitle: parseLinkField(product.link ?? '').text,
          }),
        });
        if (!isMountedRef.current) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? `HTTP ${res.status}`);
        }
        onSaveSuccess?.(field, oldValue, valueToSave);
      } catch (err) {
        if (isMountedRef.current) {
          const msg = err instanceof Error ? err.message : String(err);
          toast.error(`Failed to save: ${msg}`);
          onSaved(field, fieldValueToString(field, rawValue));
          setInputValue(fieldValueToString(field, rawValue));
        }
      } finally {
        savingRef.current = false;
        if (isMountedRef.current) setSaving(false);
      }
    },
    [field, product.rowIndex, product.link, rawValue, onSaved, onSaveSuccess],
  );
```

- [ ] **Step 6: Pass `onSaveSuccess` to sub-components in `InlineEditCell`**

Find the three lines that render `ComboboxCell`, `ImageLinksCell`, and `LinkEditCell` (near the bottom of `InlineEditCell`):

```ts
  if (COMBOBOX_FIELDS.has(field as keyof TourProduct)) {
    return <ComboboxCell product={product} field={field} onSaved={onSaved} readOnly={readOnly} />;
  }
```
Change to:
```ts
  if (COMBOBOX_FIELDS.has(field as keyof TourProduct)) {
    return <ComboboxCell product={product} field={field} onSaved={onSaved} onSaveSuccess={onSaveSuccess} readOnly={readOnly} />;
  }
```

```ts
  if (IMAGE_LINKS_FIELDS.has(field as keyof TourProduct)) {
    return <ImageLinksCell product={product} field={field} onSaved={onSaved} readOnly={readOnly} />;
  }
```
Change to:
```ts
  if (IMAGE_LINKS_FIELDS.has(field as keyof TourProduct)) {
    return <ImageLinksCell product={product} field={field} onSaved={onSaved} onSaveSuccess={onSaveSuccess} readOnly={readOnly} />;
  }
```

```ts
  if (LINK_FIELDS.has(field as keyof TourProduct)) {
    return <LinkEditCell product={product} field={field} onSaved={onSaved} readOnly={readOnly} />;
  }
```
Change to:
```ts
  if (LINK_FIELDS.has(field as keyof TourProduct)) {
    return <LinkEditCell product={product} field={field} onSaved={onSaved} onSaveSuccess={onSaveSuccess} readOnly={readOnly} />;
  }
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npm run build 2>&1 | head -40`
Expected: no errors referencing `inline-edit-cell.tsx`

- [ ] **Step 8: Commit**

```bash
git add components/products/inline-edit-cell.tsx
git commit -m "feat: add onSaveSuccess callback to InlineEditCell"
```

---

## Task 4: Propagate `onSaveSuccess` through `ProductDetailSheet`

**Files:**
- Modify: `components/products/product-detail-sheet.tsx`

- [ ] **Step 1: Add `onSaveSuccess` to `EditableFieldValueProps`**

Change `EditableFieldValueProps` from:
```ts
interface EditableFieldValueProps {
  product: TourProduct;
  field: keyof Omit<TourProduct, 'rowIndex'>;
  onSaved: (field: keyof Omit<TourProduct, 'rowIndex'>, value: string) => void;
  readOnly?: boolean;
}
```
To:
```ts
interface EditableFieldValueProps {
  product: TourProduct;
  field: keyof Omit<TourProduct, 'rowIndex'>;
  onSaved: (field: keyof Omit<TourProduct, 'rowIndex'>, value: string) => void;
  onSaveSuccess?: (field: string, oldValue: string, newValue: string) => void;
  readOnly?: boolean;
}
```

- [ ] **Step 2: Pass `onSaveSuccess` in `EditableFieldValue`**

In `EditableFieldValue`, destructure the new prop:
```ts
function EditableFieldValue({ product, field, onSaved, onSaveSuccess, readOnly }: EditableFieldValueProps) {
```

Then add `onSaveSuccess={onSaveSuccess}` to every `<InlineEditCell>` call inside this function. There are 4 occurrences, each currently like:
```tsx
<InlineEditCell product={product} field={field} onSaved={(name, next) => onSaved(name as keyof Omit<TourProduct, 'rowIndex'>, next)} readOnly={readOnly} />
```
Change each to:
```tsx
<InlineEditCell product={product} field={field} onSaved={(name, next) => onSaved(name as keyof Omit<TourProduct, 'rowIndex'>, next)} onSaveSuccess={onSaveSuccess} readOnly={readOnly} />
```

- [ ] **Step 3: Add `onSaveSuccess` to `ProductDetailSheetProps`**

Change `ProductDetailSheetProps` from:
```ts
interface ProductDetailSheetProps {
  product: TourProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (product: TourProduct) => void;
  onDeleted?: () => void;
}
```
To:
```ts
interface ProductDetailSheetProps {
  product: TourProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (product: TourProduct) => void;
  onDeleted?: () => void;
  onSaveSuccess?: (field: string, oldValue: string, newValue: string) => void;
}
```

- [ ] **Step 4: Destructure and forward `onSaveSuccess` in `ProductDetailSheet`**

Add `onSaveSuccess` to the destructured props:
```ts
export function ProductDetailSheet({
  product,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
  onSaveSuccess,
}: ProductDetailSheetProps) {
```

In the `<EditableFieldValue>` call (in the sections map, around line 425):
```tsx
<EditableFieldValue
  product={draftProduct}
  field={field.key as keyof Omit<TourProduct, 'rowIndex'>}
  onSaved={handleFieldSaved}
  readOnly={!editMode}
/>
```
Change to:
```tsx
<EditableFieldValue
  product={draftProduct}
  field={field.key as keyof Omit<TourProduct, 'rowIndex'>}
  onSaved={handleFieldSaved}
  onSaveSuccess={onSaveSuccess}
  readOnly={!editMode}
/>
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npm run build 2>&1 | head -40`
Expected: no errors referencing `product-detail-sheet.tsx`

- [ ] **Step 6: Commit**

```bash
git add components/products/product-detail-sheet.tsx
git commit -m "feat: propagate onSaveSuccess through ProductDetailSheet"
```

---

## Task 5: Wire edit history into `ProductsClient`

**Files:**
- Modify: `app/(app)/products/products-client.tsx`

- [ ] **Step 1: Add imports**

At the top of `products-client.tsx`, add after the existing imports:
```ts
import { useEditHistory, type EditRecord } from '@/lib/hooks/use-edit-history';
import { EditHistoryPopover } from '@/components/ui/edit-history-popover';
import { FIELD_LABELS } from '@/lib/constants';
```

- [ ] **Step 2: Instantiate the hook**

Inside `ProductsClient`, after the existing `const { mutate } = useSWRConfig();` line, add:
```ts
const { history, push, revert } = useEditHistory();
```

- [ ] **Step 3: Add the save-success handler**

After the `useEditHistory` line, add:
```ts
const handleProductSaveSuccess = useCallback(
  (field: string, oldValue: string, newValue: string) => {
    if (!selectedProduct) return;
    const rowLabel =
      selectedProduct.productName ||
      parseLinkField(selectedProduct.link ?? '').text ||
      `Row ${selectedProduct.rowIndex}`;
    const fieldLabel = FIELD_LABELS[field as keyof typeof FIELD_LABELS] ?? field;
    const rowIndex = selectedProduct.rowIndex;
    push({
      rowLabel,
      fieldLabel,
      oldValueDisplay: oldValue,
      newValueDisplay: newValue,
      revertFn: async () => {
        const res = await fetch(`/api/products/${rowIndex}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field, value: oldValue }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? `HTTP ${res.status}`);
        }
        mutate('/api/products');
      },
    });
  },
  [selectedProduct, push, mutate],
);
```

- [ ] **Step 4: Add the revert handler**

After the save-success handler, add:
```ts
const handleRevert = useCallback(
  async (record: EditRecord) => {
    try {
      await revert(record);
      toast.success('Reverted');
    } catch {
      toast.error('Revert failed, try again');
    }
  },
  [revert],
);
```

- [ ] **Step 5: Add the history button to the toolbar**

Find the toolbar button group (around line 400):
```tsx
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-0.5">
            ...
          </div>
          {activeView === "table" && (
            <Button ...>
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <ExportButton
```

Add `<EditHistoryPopover>` just before `<ExportButton`:
```tsx
          <EditHistoryPopover history={history} onRevert={handleRevert} />
          <ExportButton
```

- [ ] **Step 6: Pass `onSaveSuccess` to `ProductDetailSheet`**

Find the `<ProductDetailSheet` usage (around line 534):
```tsx
      <ProductDetailSheet
        product={selectedProduct}
        open={selectedProduct !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedProduct(null);
        }}
        onSaved={(product) => {
          setSelectedProduct(product);
          mutate("/api/products");
        }}
        onDeleted={() => {
          setSelectedProduct(null);
          mutate("/api/products");
        }}
      />
```
Add `onSaveSuccess={handleProductSaveSuccess}`:
```tsx
      <ProductDetailSheet
        product={selectedProduct}
        open={selectedProduct !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedProduct(null);
        }}
        onSaved={(product) => {
          setSelectedProduct(product);
          mutate("/api/products");
        }}
        onDeleted={() => {
          setSelectedProduct(null);
          mutate("/api/products");
        }}
        onSaveSuccess={handleProductSaveSuccess}
      />
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npm run build 2>&1 | head -40`
Expected: no errors

- [ ] **Step 8: Manual smoke test**

Start dev server: `npm run dev`
1. Open the Products page
2. Click a product row to open the detail sheet
3. Click Edit, change any text field, press Enter or blur
4. Verify the Clock icon in the toolbar gains a badge showing "1"
5. Click the Clock icon — confirm the popover shows the edit with field label and old→new values
6. Click Revert — confirm the field reverts in the table and the entry disappears from history

- [ ] **Step 9: Commit**

```bash
git add app/\(app\)/products/products-client.tsx
git commit -m "feat: wire edit history into ProductsClient"
```

---

## Task 6: Add `onSaveComplete` to `WrittenProductDetailSheet`

**Files:**
- Modify: `components/written-products/written-product-detail-sheet.tsx`

- [ ] **Step 1: Add `onSaveComplete` to `WrittenProductDetailSheetProps`**

Change:
```ts
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
To:
```ts
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
  onSaveComplete?: (old: WrittenProduct, updated: WrittenProduct) => void;
  onDelete: (product: WrittenProduct) => void;
}
```

- [ ] **Step 2: Destructure and call `onSaveComplete` in `handleSubmit`**

Add `onSaveComplete` to the destructured props:
```ts
export function WrittenProductDetailSheet({
  product,
  inProducts,
  suggestions,
  onClose,
  onSaved,
  onSaveComplete,
  onDelete,
}: WrittenProductDetailSheetProps) {
```

In `handleSubmit`, change:
```ts
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
```
To:
```ts
  async function handleSubmit(data: Omit<WrittenProduct, 'rowIndex'>) {
    if (!product) return;
    setIsSubmitting(true);
    const oldSnapshot = product;
    try {
      const res = await fetch(`/api/written-products/${product.rowIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated: WrittenProduct = await res.json();
      onSaved(updated);
      onSaveComplete?.(oldSnapshot, updated);
      toast.success('Saved');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  }
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npm run build 2>&1 | head -40`
Expected: no errors referencing `written-product-detail-sheet.tsx`

- [ ] **Step 4: Commit**

```bash
git add components/written-products/written-product-detail-sheet.tsx
git commit -m "feat: add onSaveComplete callback to WrittenProductDetailSheet"
```

---

## Task 7: Wire edit history into `WrittenProductsClient`

**Files:**
- Modify: `app/(app)/written-products/written-products-client.tsx`

- [ ] **Step 1: Add imports**

At the top of `written-products-client.tsx`, add:
```ts
import { useEditHistory, type EditRecord } from '@/lib/hooks/use-edit-history';
import { EditHistoryPopover } from '@/components/ui/edit-history-popover';
```

- [ ] **Step 2: Instantiate the hook**

Inside `WrittenProductsClient`, after `const { mutate } = useSWRConfig();`, add:
```ts
const { history, push, revert } = useEditHistory();
```

- [ ] **Step 3: Add the save-complete handler**

After the `useEditHistory` line, add:
```ts
function handleSaveComplete(old: WrittenProduct, updated: WrittenProduct) {
  const rowLabel =
    parseLinkField(old.textLink ?? '').text || old.textLink || `Row ${old.rowIndex}`;
  const changedFields = (Object.keys(updated) as (keyof WrittenProduct)[]).filter(
    (k) => k !== 'rowIndex' && updated[k] !== old[k],
  );
  const n = changedFields.length;
  const oldRowIndex = old.rowIndex;
  const oldSnapshot = old;
  push({
    rowLabel,
    fieldLabel: n === 1 ? String(changedFields[0]) : `${n} fields`,
    oldValueDisplay: 'Previous version',
    newValueDisplay: 'Updated',
    revertFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { rowIndex: _rowIndex, ...body } = oldSnapshot;
      const res = await fetch(`/api/written-products/${oldRowIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      await mutate('/api/written-products');
    },
  });
}
```

- [ ] **Step 4: Add the revert handler**

After `handleSaveComplete`, add:
```ts
async function handleRevert(record: EditRecord) {
  try {
    await revert(record);
    toast.success('Reverted');
  } catch {
    toast.error('Revert failed, try again');
  }
}
```

- [ ] **Step 5: Add history button to toolbar**

Find the toolbar buttons area (around line 246):
```tsx
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setIsFullscreen(true)}
            aria-label="Enter fullscreen"
            title="Fullscreen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <WrittenProductExportButton products={filteredProducts} />
```

Add `<EditHistoryPopover>` before `<WrittenProductExportButton`:
```tsx
          <EditHistoryPopover history={history} onRevert={handleRevert} />
          <WrittenProductExportButton products={filteredProducts} />
```

- [ ] **Step 6: Pass `onSaveComplete` to `WrittenProductDetailSheet`**

Find the `<WrittenProductDetailSheet` usage (around line 325):
```tsx
      <WrittenProductDetailSheet
        product={editProduct}
        inProducts={...}
        suggestions={suggestions}
        onClose={() => setEditProduct(null)}
        onSaved={handleSaved}
        onDelete={(p) => { setEditProduct(null); setDeleteProduct(p); }}
      />
```
Add `onSaveComplete={handleSaveComplete}`:
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
        onSaveComplete={handleSaveComplete}
        onDelete={(p) => { setEditProduct(null); setDeleteProduct(p); }}
      />
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npm run build 2>&1 | head -40`
Expected: no errors

- [ ] **Step 8: Manual smoke test**

With dev server running (`npm run dev`):
1. Open Written Products page
2. Verify the Clock icon appears in the toolbar (no badge yet)
3. Click a written product row to open the detail sheet
4. Change one or more fields, click Save
5. Confirm the Clock icon in the toolbar gains a badge showing "1"
6. Click the Clock icon — confirm the popover shows the entry with the product title and field count
7. Click Revert — confirm the written product is restored and the entry disappears

- [ ] **Step 9: Commit**

```bash
git add app/\(app\)/written-products/written-products-client.tsx
git commit -m "feat: wire edit history into WrittenProductsClient"
```

---

## Self-Review Notes

After writing this plan, I checked it against the spec:

- **`EditRecord.revertFn` closure pattern** ✓ — used in Tasks 5 & 7
- **Session-only (no persistence)** ✓ — all state is `useState`, no localStorage
- **Max 10 entries** ✓ — enforced in `useEditHistory.push` via `.slice(0, MAX_HISTORY)`
- **Toolbar button with badge** ✓ — Task 2 renders Clock + Badge in `EditHistoryPopover`
- **Revert shows spinner while in-flight** ✓ — `revertingId` state in `EditHistoryPopover`
- **Error handling** ✓ — revert entry stays on failure; toast shown in `handleRevert`
- **Products: PATCH single field** ✓ — Task 5 `revertFn`
- **Written products: PUT full snapshot** ✓ — Task 7 `revertFn` sends `oldSnapshot`
- **`onSaveSuccess` only called on API success** ✓ — placed after `if (!res.ok) throw`
- **Written product `onSaveComplete` called before `onClose`** ✓ — Task 6 ordering
