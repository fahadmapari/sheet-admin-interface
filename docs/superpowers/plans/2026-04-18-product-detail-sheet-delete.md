# Product Detail Sheet — Delete Option Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an always-visible Delete button to the `ProductDetailSheet` footer that lets users permanently remove a single product row from Google Sheets.

**Architecture:** Reuse the existing `DeleteConfirmDialog` component and `DELETE /api/products/bulk` endpoint. Add `deleteDialogOpen` state and `handleDelete` function to `ProductDetailSheet`, add `onDeleted` optional callback prop, and wire the callback in `products-client.tsx`.

**Tech Stack:** React, Next.js App Router, SWR, sonner (toast), existing `DeleteConfirmDialog`, `DELETE /api/products/bulk`

---

## File Map

| File | Change |
|---|---|
| `components/products/product-detail-sheet.tsx` | Add delete state, handler, button, dialog |
| `app/(app)/products/products-client.tsx` | Pass `onDeleted` prop |

---

## Task 1: Add delete to `ProductDetailSheet`

**Files:**
- Modify: `components/products/product-detail-sheet.tsx`

- [ ] **Step 1: Import `DeleteConfirmDialog` and `Trash2` icon**

In [product-detail-sheet.tsx](components/products/product-detail-sheet.tsx), find the existing import block at the top. Add these two imports:

```tsx
import { Trash2 } from 'lucide-react';
import { DeleteConfirmDialog } from './delete-confirm-dialog';
```

The existing lucide import line is:
```tsx
import { ArrowRight, ChevronDown, Clock, ExternalLink, MapPin, Pencil, Users } from 'lucide-react';
```

Replace it with:
```tsx
import { ArrowRight, ChevronDown, Clock, ExternalLink, MapPin, Pencil, Trash2, Users } from 'lucide-react';
```

And add the `DeleteConfirmDialog` import after the `InlineEditCell` import:
```tsx
import { DeleteConfirmDialog } from './delete-confirm-dialog';
```

- [ ] **Step 2: Add `onDeleted` prop to the interface**

Find `ProductDetailSheetProps`:
```tsx
interface ProductDetailSheetProps {
  product: TourProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (product: TourProduct) => void;
}
```

Replace with:
```tsx
interface ProductDetailSheetProps {
  product: TourProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (product: TourProduct) => void;
  onDeleted?: () => void;
}
```

- [ ] **Step 3: Destructure `onDeleted` in the function signature**

Find:
```tsx
export function ProductDetailSheet({
  product,
  open,
  onOpenChange,
  onSaved,
}: ProductDetailSheetProps) {
```

Replace with:
```tsx
export function ProductDetailSheet({
  product,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
}: ProductDetailSheetProps) {
```

- [ ] **Step 4: Add `deleteDialogOpen` state**

Find the existing state declarations near the top of the function body:
```tsx
  const [draftProduct, setDraftProduct] = useState<TourProduct | null>(product);
  const [editMode, setEditMode] = useState(false);
  const [activeSection, setActiveSection] = useState('');
```

Add `deleteDialogOpen` state immediately after `editMode`:
```tsx
  const [draftProduct, setDraftProduct] = useState<TourProduct | null>(product);
  const [editMode, setEditMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
```

- [ ] **Step 5: Add `handleDelete` function**

Find the `handleFieldSaved` function:
```tsx
  const handleFieldSaved = (field: keyof Omit<TourProduct, 'rowIndex'>, rawValue: string) => {
```

Add `handleDelete` immediately before it:
```tsx
  const handleDelete = async () => {
    if (!draftProduct) return;
    const res = await fetch('/api/products/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowIndexes: [draftProduct.rowIndex] }),
    });
    if (res.ok) {
      toast.success('Product deleted');
      onDeleted?.();
      onOpenChange(false);
    } else {
      toast.error('Delete failed');
    }
  };

  const handleFieldSaved = (field: keyof Omit<TourProduct, 'rowIndex'>, rawValue: string) => {
```

- [ ] **Step 6: Add the Delete button to the footer**

Find the footer button group — the Close button:
```tsx
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
```

Replace with:
```tsx
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
```

- [ ] **Step 7: Render `DeleteConfirmDialog`**

Find the closing of the component — the `MoveToStageDialog` render just before the final closing tags:
```tsx
      <MoveToStageDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        targetStage={ASSEMBLY_STAGES[0]}
        onConfirm={handleAddToAssemblyConfirm}
      />
    </Sheet>
```

Replace with:
```tsx
      <MoveToStageDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        targetStage={ASSEMBLY_STAGES[0]}
        onConfirm={handleAddToAssemblyConfirm}
      />
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        count={1}
        onConfirm={handleDelete}
      />
    </Sheet>
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -40
```

Expected: no TypeScript errors in the modified files.

- [ ] **Step 9: Commit**

```bash
git add components/products/product-detail-sheet.tsx
git commit -m "feat: add delete button to ProductDetailSheet footer"
```

---

## Task 2: Wire `onDeleted` in `products-client.tsx`

**Files:**
- Modify: `app/(app)/products/products-client.tsx`

- [ ] **Step 1: Add `onDeleted` prop to `<ProductDetailSheet>`**

Find:
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
      />
```

Replace with:
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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -40
```

Expected: clean build, no errors.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/products/products-client.tsx
git commit -m "feat: wire onDeleted callback in products-client"
```

---

## Manual Testing Checklist

1. Open any product in the detail sheet → Delete button visible in footer (red, with trash icon).
2. Click Delete → confirm dialog appears with "Delete 1 product?".
3. Click Cancel → dialog closes, sheet stays open, no changes.
4. Click Delete again → confirm → product row removed from Google Sheet, sheet closes, product disappears from the list.
5. Open product in assembly view → Delete button present; on confirm sheet closes (no JS errors).
