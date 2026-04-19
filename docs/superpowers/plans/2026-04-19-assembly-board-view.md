# Assembly Board View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in Kanban-style board view to the Assembly Line tab with drag-and-drop batch movement between stages.

**Architecture:** Introduce a view toggle that branches the Assembly Line tab between the existing stacked list view and a new board view. Extract a shared product table and shared helpers so both views stay in lock-step. The board wraps `@dnd-kit/core` and reuses the existing `/api/assembly/move` endpoint — no backend changes.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind, shadcn/ui, SWR, `@dnd-kit/core`, `@dnd-kit/sortable`, localStorage.

**Spec:** `docs/superpowers/specs/2026-04-19-assembly-board-view-design.md`

**Testing note:** This project has no automated test framework (no `test` script in `package.json`). Each task ends with manual verification against `npm run dev` and `npm run lint` / `npm run build`. Do not introduce a test framework for this feature.

---

## Task 1: Install DnD Dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install `@dnd-kit/core` and `@dnd-kit/sortable`**

Run from repo root:
```bash
npm install @dnd-kit/core @dnd-kit/sortable
```

Expected: both packages added to `dependencies` in `package.json`, lockfile updated.

- [ ] **Step 2: Verify install**

Run:
```bash
npm run lint
npm run build
```

Expected: lint passes, build succeeds (no code change yet so this is just a baseline check).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @dnd-kit dependencies for assembly board"
```

---

## Task 2: Extract Shared Assembly Helpers

Move three helpers out of `batch-card.tsx` and `pipeline-summary.tsx` into a single shared module so the board view can reuse them without duplication.

**Files:**
- Create: `components/assembly/batch-helpers.ts`
- Modify: `components/assembly/batch-card.tsx`
- Modify: `components/assembly/pipeline-summary.tsx`

- [ ] **Step 1: Create `components/assembly/batch-helpers.ts`**

```ts
import type { AssemblyBatch, AssemblyStage, TourProduct } from '@/lib/types';

export function getDaysInStage(batch: Pick<AssemblyBatch, 'movedToStageAt' | 'createdAt'>): number {
  const ref = batch.movedToStageAt ?? batch.createdAt;
  return (Date.now() - new Date(ref).getTime()) / 86_400_000;
}

export function getStageStaleness(
  batches: Pick<AssemblyBatch, 'movedToStageAt' | 'createdAt'>[],
): 'red' | 'yellow' | 'none' {
  let worst: 'red' | 'yellow' | 'none' = 'none';
  for (const b of batches) {
    const days = getDaysInStage(b);
    if (days > 7) return 'red';
    if (days > 3) worst = 'yellow';
  }
  return worst;
}

export function isProductReady(product: TourProduct, stage: AssemblyStage): boolean {
  switch (stage) {
    case 'In Review':
      return !!product.isOk && product.isOk.trim() !== '';
    case '2nd Review':
      return !!product.ssOk;
    case 'Buying Price':
      return !!product.totalBuyingPrice && product.totalBuyingPrice.trim() !== '';
    case 'Selling Price':
      return (
        !!product.b2bPriceOnRequest &&
        product.b2bPriceOnRequest.trim() !== '' &&
        !!product.b2cPriceOnRequest &&
        product.b2cPriceOnRequest.trim() !== ''
      );
    case 'Ready for Upload':
      return !!product.productLink && product.productLink.trim() !== '';
    default:
      return false;
  }
}
```

- [ ] **Step 2: Update `components/assembly/batch-card.tsx` to use the shared helpers**

Remove the local `getDaysInStage` function (currently at the top of the file) and the inline `isProductReady` method inside `BatchCard`. Import them from the new helpers file.

At the top of `batch-card.tsx`, replace the `import { ... } from '@/lib/types'` block's neighbour imports with an added import:

```ts
import { getDaysInStage, isProductReady } from './batch-helpers';
```

Delete the top-level `function getDaysInStage(...)`.

Inside `BatchCard`, delete the inner `function isProductReady(product)` definition and update the two call sites to pass `batch.stage`:

```ts
// Before:
const readyProducts = batchProducts.filter(isProductReady);
// After:
const readyProducts = batchProducts.filter((p) => isProductReady(p, batch.stage));

// Before:
{isProductReady(product) ? (
// After:
{isProductReady(product, batch.stage) ? (
```

- [ ] **Step 3: Update `components/assembly/pipeline-summary.tsx` to use the shared helpers**

Delete the local `getDaysInStage` and `getStageStaleness` functions. Add import:

```ts
import { getStageStaleness } from './batch-helpers';
```

(The `getDaysInStage` import is not needed here — `getStageStaleness` encapsulates it.)

- [ ] **Step 4: Verify lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed with no new errors.

- [ ] **Step 5: Manual verification**

Run `npm run dev`, navigate to `/assembly`. Confirm the Pipeline Summary tiles still show correct counts and staleness dots. Expand a batch in a stage and confirm the readiness column still shows green/empty circles for each product correctly.

- [ ] **Step 6: Commit**

```bash
git add components/assembly/batch-helpers.ts components/assembly/batch-card.tsx components/assembly/pipeline-summary.tsx
git commit -m "refactor: extract shared assembly batch helpers"
```

---

## Task 3: Extract `BatchProductsTable` Component

Pull the inline product `<table>` out of `BatchCard` so both the list-view batch card and the new board-view batch card can render the same table.

**Files:**
- Create: `components/assembly/batch-products-table.tsx`
- Modify: `components/assembly/batch-card.tsx`

- [ ] **Step 1: Create `components/assembly/batch-products-table.tsx`**

```tsx
'use client';

import { ArrowRight, CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, parseLinkField } from '@/lib/utils';
import { isProductReady } from './batch-helpers';
import type { AssemblyBatch, AssemblyStage, TourProduct } from '@/lib/types';

interface BatchProductsTableProps {
  batch: AssemblyBatch;
  products: TourProduct[];
  isAdmin: boolean;
  readOnly: boolean;
  movingProductRowIndex: number | null;
  isMoving: boolean;
  nextStage: AssemblyStage | null;
  showReadiness: boolean;
  onProductClick: (product: TourProduct) => void;
  onProductMoveClick: (product: TourProduct, e: React.MouseEvent) => void;
  onRemoveProductClick: (rowIndex: number) => void;
}

export function BatchProductsTable({
  batch,
  products,
  isAdmin,
  readOnly,
  movingProductRowIndex,
  isMoving,
  nextStage,
  showReadiness,
  onProductClick,
  onProductMoveClick,
  onRemoveProductClick,
}: BatchProductsTableProps) {
  const batchProducts = products.filter((p) =>
    batch.productRowIndexes.includes(p.rowIndex),
  );

  if (batchProducts.length === 0) {
    return <p className="py-2 text-sm text-[hsl(var(--text-tertiary))]">No products loaded.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-[hsl(var(--border))]">
            <th className="py-1.5 pr-4 text-left text-xs font-medium text-[hsl(var(--text-tertiary))]">
              Product
            </th>
            <th className="py-1.5 pr-4 text-left text-xs font-medium text-[hsl(var(--text-tertiary))]">
              City
            </th>
            <th className="py-1.5 pr-4 text-left text-xs font-medium text-[hsl(var(--text-tertiary))]">
              Country
            </th>
            <th className="py-1.5 text-left text-xs font-medium text-[hsl(var(--text-tertiary))]">
              Status
            </th>
            {showReadiness && (
              <th className="py-1.5 pl-3 text-left text-xs font-medium text-[hsl(var(--text-tertiary))]">
                Ready
              </th>
            )}
            {nextStage && !readOnly && (
              <th className="py-1.5 pl-3 text-right text-xs font-medium text-[hsl(var(--text-tertiary))]">
                Move
              </th>
            )}
            {isAdmin && !readOnly && (
              <th className="py-1.5 pl-2 text-right text-xs font-medium text-[hsl(var(--text-tertiary))]" />
            )}
          </tr>
        </thead>
        <tbody>
          {batchProducts.map((product) => {
            const linkParsed = product.link ? parseLinkField(product.link) : null;
            const displayName =
              product.productName ||
              linkParsed?.text ||
              product.link ||
              `${product.city}, ${product.country}`;
            const isThisProductMoving = movingProductRowIndex === product.rowIndex;

            return (
              <tr
                key={product.rowIndex}
                className={cn(
                  'cursor-pointer border-b border-[hsl(var(--border))] last:border-0',
                  'transition-colors hover:bg-[hsl(var(--surface))]',
                )}
                onClick={() => onProductClick(product)}
              >
                <td className="max-w-[220px] truncate py-2 pr-4 font-medium text-[hsl(var(--text-primary))]">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="truncate block">{displayName}</span>
                      </TooltipTrigger>
                      <TooltipContent>{displayName}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </td>
                <td className="py-2 pr-4 text-[hsl(var(--text-secondary))]">{product.city}</td>
                <td className="py-2 pr-4 text-[hsl(var(--text-secondary))]">{product.country}</td>
                <td className="py-2">
                  {product.productStatus ? (
                    <Badge variant="outline" className="text-xs">
                      {product.productStatus}
                    </Badge>
                  ) : (
                    <span className="text-[hsl(var(--text-tertiary))]">-</span>
                  )}
                </td>
                {showReadiness && (
                  <td className="py-2 pl-3">
                    {isProductReady(product, batch.stage) ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-[hsl(var(--text-tertiary))] opacity-40" />
                    )}
                  </td>
                )}
                {nextStage && !readOnly && (
                  <td className="py-2 pl-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      disabled={isThisProductMoving || isMoving}
                      onClick={(e) => onProductMoveClick(product, e)}
                    >
                      <ArrowRight className="mr-1 h-3 w-3" />
                      {isThisProductMoving ? '...' : 'Move'}
                    </Button>
                  </td>
                )}
                {isAdmin && !readOnly && (
                  <td className="py-2 pl-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-[hsl(var(--text-tertiary))] hover:text-destructive"
                      aria-label="Remove product from assembly"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveProductClick(product.rowIndex);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Update `components/assembly/batch-card.tsx` to use `BatchProductsTable`**

Replace the entire expanded-region `<div className="border-t border-[hsl(var(--border))] px-4 py-2">...</div>` block (the one containing the inline `<table>`) with:

```tsx
{expanded && (
  <div className="border-t border-[hsl(var(--border))] px-4 py-2">
    <BatchProductsTable
      batch={batch}
      products={products}
      isAdmin={isAdmin}
      readOnly={readOnly}
      movingProductRowIndex={movingProductRowIndex}
      isMoving={isMoving}
      nextStage={nextStage}
      showReadiness={showReadiness}
      onProductClick={onProductClick}
      onProductMoveClick={handleProductMoveClick}
      onRemoveProductClick={setConfirmRemoveProductRowIndex}
    />
  </div>
)}
```

Add the import at the top of `batch-card.tsx`:

```ts
import { BatchProductsTable } from './batch-products-table';
```

Remove now-unused imports from `batch-card.tsx`: `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger`, `CheckCircle2`, `Circle`. Do NOT remove `parseLinkField` — it is still used by the remove-product confirmation dialog further down in the file. Run `npm run lint` if uncertain; unused imports will surface as errors.

- [ ] **Step 3: Verify lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed.

- [ ] **Step 4: Manual verification**

Run `npm run dev`. On `/assembly`:
- Expand a batch card → confirm product table renders identically to before.
- Click a product row → detail sheet opens.
- Click per-product Move → readiness dialog appears for not-ready products, otherwise moves immediately.
- As admin, click per-product trash → remove-product confirmation appears.

- [ ] **Step 5: Commit**

```bash
git add components/assembly/batch-products-table.tsx components/assembly/batch-card.tsx
git commit -m "refactor: extract BatchProductsTable for reuse across views"
```

---

## Task 4: Create `useAssemblyView` Hook

**Files:**
- Create: `lib/hooks/use-assembly-view.ts`

- [ ] **Step 1: Create `lib/hooks/use-assembly-view.ts`**

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';

export type AssemblyView = 'list' | 'board';

const STORAGE_KEY = 'assembly:view';
const BOARD_MIN_WIDTH = 768;

function readStoredView(): AssemblyView {
  if (typeof window === 'undefined') return 'list';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'board' ? 'board' : 'list';
  } catch {
    return 'list';
  }
}

function writeStoredView(view: AssemblyView): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, view);
  } catch {
    // Ignore quota / private-mode errors.
  }
}

function isViewportBoardCapable(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= BOARD_MIN_WIDTH;
}

export function useAssemblyView(): {
  view: AssemblyView;
  storedView: AssemblyView;
  boardAvailable: boolean;
  setView: (view: AssemblyView) => void;
} {
  const [storedView, setStoredView] = useState<AssemblyView>('list');
  const [boardAvailable, setBoardAvailable] = useState(false);

  useEffect(() => {
    setStoredView(readStoredView());
    setBoardAvailable(isViewportBoardCapable());

    const onResize = () => setBoardAvailable(isViewportBoardCapable());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const setView = useCallback((next: AssemblyView) => {
    setStoredView(next);
    writeStoredView(next);
  }, []);

  const effective: AssemblyView =
    storedView === 'board' && boardAvailable ? 'board' : 'list';

  return { view: effective, storedView, boardAvailable, setView };
}
```

- [ ] **Step 2: Verify lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/use-assembly-view.ts
git commit -m "feat: add useAssemblyView hook for view preference"
```

---

## Task 5: Create `AssemblyViewToggle` Component

**Files:**
- Create: `components/assembly/assembly-view-toggle.tsx`

- [ ] **Step 1: Create `components/assembly/assembly-view-toggle.tsx`**

```tsx
'use client';

import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AssemblyView } from '@/lib/hooks/use-assembly-view';

interface AssemblyViewToggleProps {
  view: AssemblyView;
  onChange: (view: AssemblyView) => void;
}

export function AssemblyViewToggle({ view, onChange }: AssemblyViewToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Assembly view"
      className="hidden items-center overflow-hidden rounded-md border border-[hsl(var(--border))] md:inline-flex"
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        role="radio"
        aria-checked={view === 'list'}
        aria-label="List view"
        className={cn(
          'h-8 rounded-none border-r border-[hsl(var(--border))] px-3',
          view === 'list'
            ? 'bg-[hsl(var(--surface-raised))] text-[hsl(var(--text-primary))]'
            : 'text-[hsl(var(--text-tertiary))]',
        )}
        onClick={() => onChange('list')}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        role="radio"
        aria-checked={view === 'board'}
        aria-label="Board view"
        className={cn(
          'h-8 rounded-none px-3',
          view === 'board'
            ? 'bg-[hsl(var(--surface-raised))] text-[hsl(var(--text-primary))]'
            : 'text-[hsl(var(--text-tertiary))]',
        )}
        onClick={() => onChange('board')}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Verify lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed.

- [ ] **Step 3: Commit**

```bash
git add components/assembly/assembly-view-toggle.tsx
git commit -m "feat: add AssemblyViewToggle segmented control"
```

---

## Task 6: Create `BoardBatchCard` Component

A draggable batch card with collapsed card face and expandable product table. The card emits move intent via props; the board parent handles readiness gating.

**Files:**
- Create: `components/assembly/board-batch-card.tsx`

- [ ] **Step 1: Create `components/assembly/board-batch-card.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  GripVertical,
  Package,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { BatchProductsTable } from './batch-products-table';
import { getDaysInStage, isProductReady } from './batch-helpers';
import {
  ASSEMBLY_STAGES,
  type AssemblyBatch,
  type AssemblyStage,
  type TourProduct,
} from '@/lib/types';

interface BoardBatchCardProps {
  batch: AssemblyBatch;
  products: TourProduct[];
  isAdmin: boolean;
  isMoving: boolean;
  movingProductRowIndex: number | null;
  onRequestMove: (batch: AssemblyBatch, targetStage: AssemblyStage) => void;
  onMoveProductToNextStage: (product: TourProduct, batch: AssemblyBatch) => Promise<void>;
  onProductClick: (product: TourProduct) => void;
  onRemoveBatch: (batchId: string) => Promise<void>;
  onRemoveProduct: (rowIndex: number) => Promise<void>;
}

export function BoardBatchCard({
  batch,
  products,
  isAdmin,
  isMoving,
  movingProductRowIndex,
  onRequestMove,
  onMoveProductToNextStage,
  onProductClick,
  onRemoveBatch,
  onRemoveProduct,
}: BoardBatchCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmRemoveBatch, setConfirmRemoveBatch] = useState(false);
  const [confirmRemoveProductRowIndex, setConfirmRemoveProductRowIndex] = useState<number | null>(
    null,
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: batch._id,
    data: { batch, sourceStage: batch.stage },
  });

  const batchProducts = products.filter((p) => batch.productRowIndexes.includes(p.rowIndex));
  const stageIndex = ASSEMBLY_STAGES.indexOf(batch.stage);
  const nextStage = stageIndex >= 0 ? ASSEMBLY_STAGES[stageIndex + 1] ?? null : null;
  const readyCount = batchProducts.filter((p) => isProductReady(p, batch.stage)).length;
  const totalCount = batchProducts.length;
  const daysInStage = getDaysInStage(batch);
  const showStaleness = batch.stage !== 'Uploaded';
  const showReadiness = batch.stage !== 'Uploaded';

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }
    : undefined;

  // Per-product intercept: open dialog via onMoveProductToNextStage wrapper in parent? Board's readiness
  // dialog is at batch level only. Per-product moves always go forward; match list-view behavior by
  // firing move immediately when ready, otherwise show a local dialog.
  const handleProductMoveClick = (product: TourProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!nextStage) return;
    if (isProductReady(product, batch.stage)) {
      void onMoveProductToNextStage(product, batch);
      return;
    }
    setPendingProductMove({ product, targetStage: nextStage });
  };

  const [pendingProductMove, setPendingProductMove] = useState<{
    product: TourProduct;
    targetStage: AssemblyStage;
  } | null>(null);

  const confirmProductMove = async () => {
    if (!pendingProductMove) return;
    await onMoveProductToNextStage(pendingProductMove.product, batch);
    setPendingProductMove(null);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-sm',
          'transition-shadow hover:shadow-md',
          isDragging && 'ring-2 ring-primary',
        )}
      >
        {/* Drag handle + card head */}
        <div className="flex items-start gap-2 px-3 pt-3">
          <button
            type="button"
            className="mt-0.5 cursor-grab touch-none text-[hsl(var(--text-tertiary))] active:cursor-grabbing"
            aria-label={`Drag batch ${batch.name}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Package className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--text-secondary))]" />
          <span className="flex-1 break-words text-sm font-medium text-[hsl(var(--text-primary))]">
            {batch.name}
          </span>
          {isAdmin && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-[hsl(var(--text-tertiary))] hover:text-destructive"
              aria-label="Remove batch"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmRemoveBatch(true);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Meta row: count + staleness/date */}
        <div className="flex items-center gap-2 px-3 pt-2 text-xs">
          <Badge variant="secondary" className="text-xs">
            {totalCount}
          </Badge>
          {showStaleness && daysInStage >= 3 ? (
            <span
              className={cn(
                'font-medium',
                daysInStage > 7 ? 'text-red-500' : 'text-yellow-600 dark:text-yellow-400',
              )}
            >
              {Math.floor(daysInStage)}d in stage
            </span>
          ) : (
            <span className="text-[hsl(var(--text-tertiary))]">
              {new Date(batch.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>

        {/* Readiness + move button */}
        {showReadiness && (
          <div className="flex items-center justify-between gap-2 px-3 pt-2 text-xs">
            <span className="flex items-center gap-1 text-[hsl(var(--text-secondary))]">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              {readyCount}/{totalCount} ready
            </span>
          </div>
        )}

        {/* Move action row */}
        {nextStage && (
          <div className="flex px-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 flex-1 rounded-r-none border-r-0 text-xs"
              disabled={isMoving}
              onClick={(e) => {
                e.stopPropagation();
                onRequestMove(batch, nextStage);
              }}
            >
              <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
              {isMoving ? 'Moving...' : `Move to ${nextStage}`}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-l-none px-2"
                  disabled={isMoving}
                  aria-label="Select stage for batch"
                  onClick={(event) => event.stopPropagation()}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {ASSEMBLY_STAGES.map((stage) => (
                  <DropdownMenuItem
                    key={stage}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestMove(batch, stage);
                    }}
                  >
                    {stage}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Expand toggle */}
        <button
          type="button"
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-b-lg border-t border-[hsl(var(--border))] py-1.5 text-xs text-[hsl(var(--text-tertiary))] hover:bg-[hsl(var(--surface))]"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          aria-expanded={expanded}
        >
          {expanded ? 'Hide products' : `Show ${totalCount} product${totalCount !== 1 ? 's' : ''}`}
        </button>

        {expanded && (
          <div className="border-t border-[hsl(var(--border))] px-3 py-2">
            <BatchProductsTable
              batch={batch}
              products={products}
              isAdmin={isAdmin}
              readOnly={false}
              movingProductRowIndex={movingProductRowIndex}
              isMoving={isMoving}
              nextStage={nextStage}
              showReadiness={showReadiness}
              onProductClick={onProductClick}
              onProductMoveClick={handleProductMoveClick}
              onRemoveProductClick={setConfirmRemoveProductRowIndex}
            />
          </div>
        )}
      </div>

      {/* Remove batch confirmation */}
      <Dialog open={confirmRemoveBatch} onOpenChange={setConfirmRemoveBatch}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove batch</DialogTitle>
          </DialogHeader>
          <p className="py-2 text-sm text-[hsl(var(--text-secondary))]">
            Remove batch{' '}
            <span className="font-medium text-[hsl(var(--text-primary))]">&ldquo;{batch.name}&rdquo;</span>?
            All{' '}
            <span className="font-medium text-[hsl(var(--text-primary))]">{batch.productRowIndexes.length}</span>{' '}
            product{batch.productRowIndexes.length !== 1 ? 's' : ''} will be removed from assembly.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemoveBatch(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmRemoveBatch(false);
                void onRemoveBatch(batch._id);
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove product confirmation */}
      {confirmRemoveProductRowIndex !== null && (
        <Dialog
          open={confirmRemoveProductRowIndex !== null}
          onOpenChange={(open) => {
            if (!open) setConfirmRemoveProductRowIndex(null);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Remove product</DialogTitle>
            </DialogHeader>
            <p className="py-2 text-sm text-[hsl(var(--text-secondary))]">
              Remove product from assembly?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmRemoveProductRowIndex(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  const idx = confirmRemoveProductRowIndex;
                  setConfirmRemoveProductRowIndex(null);
                  void onRemoveProduct(idx);
                }}
              >
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Per-product not-ready confirmation */}
      <Dialog
        open={pendingProductMove !== null}
        onOpenChange={(open) => {
          if (!open) setPendingProductMove(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move product</DialogTitle>
          </DialogHeader>
          <p className="py-2 text-sm text-[hsl(var(--text-secondary))]">
            This product is not ready for{' '}
            <span className="font-medium text-[hsl(var(--text-primary))]">
              {pendingProductMove?.targetStage}
            </span>
            . Move it anyway?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingProductMove(null)}>
              Cancel
            </Button>
            <Button onClick={() => void confirmProductMove()}>Move anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 2: Verify lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed. Component is unused so far — that's fine.

- [ ] **Step 3: Commit**

```bash
git add components/assembly/board-batch-card.tsx
git commit -m "feat: add BoardBatchCard draggable card component"
```

---

## Task 7: Create `BoardColumn` Component

One Kanban column: header (stage name, count, staleness, owner chips, admin popover, collapse chevron), body (droppable), and a collapsed vertical rail variant.

**Files:**
- Create: `components/assembly/board-column.tsx`

- [ ] **Step 1: Create `components/assembly/board-column.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Check, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getStageStaleness } from './batch-helpers';
import type { AssemblyBatch, AssemblyStage } from '@/lib/types';

interface BoardColumnProps {
  stage: AssemblyStage;
  batches: AssemblyBatch[];
  isAdmin: boolean;
  stageOwners: string[];
  allEmails: string[];
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onOwnersChange: (emails: string[]) => Promise<void>;
  children: React.ReactNode;
}

export function BoardColumn({
  stage,
  batches,
  isAdmin,
  stageOwners,
  allEmails,
  collapsed,
  onCollapsedChange,
  onOwnersChange,
  children,
}: BoardColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: `stage-col-${stage}`, data: { stage } });

  const [ownerPopoverOpen, setOwnerPopoverOpen] = useState(false);
  const [pendingOwners, setPendingOwners] = useState<string[]>([]);
  const [savingOwners, setSavingOwners] = useState(false);

  // When a drag hovers a collapsed column, auto-expand mid-drag.
  useEffect(() => {
    if (isOver && collapsed) {
      onCollapsedChange(false);
    }
  }, [isOver, collapsed, onCollapsedChange]);

  const staleness = stage !== 'Uploaded' ? getStageStaleness(batches) : 'none';
  const initials = (email: string) => {
    const parts = email.split('@')[0].split(/[._-]/);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  };
  const displayOwners = stageOwners.slice(0, 3);
  const extraCount = stageOwners.length - 3;

  function openOwnerPopover() {
    setPendingOwners([...stageOwners]);
    setOwnerPopoverOpen(true);
  }

  function toggleEmail(email: string) {
    setPendingOwners((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email],
    );
  }

  async function saveOwners() {
    setSavingOwners(true);
    try {
      await onOwnersChange(pendingOwners);
      setOwnerPopoverOpen(false);
    } finally {
      setSavingOwners(false);
    }
  }

  if (collapsed) {
    return (
      <div
        ref={setNodeRef}
        id={`board-col-${stage}`}
        className={cn(
          'flex w-12 shrink-0 flex-col items-center gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] py-3',
          isOver && 'ring-2 ring-primary',
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          aria-label={`Expand ${stage} column`}
          onClick={() => onCollapsedChange(false)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span
          className="select-none text-xs font-semibold text-[hsl(var(--text-secondary))]"
          style={{ writingMode: 'vertical-rl' }}
        >
          {stage}
        </span>
        <Badge variant="outline" className="text-xs">
          {batches.length}
        </Badge>
      </div>
    );
  }

  return (
    <div
      id={`board-col-${stage}`}
      className="flex w-[320px] shrink-0 flex-col rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))]"
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] px-3 py-2.5">
        <span className="flex-1 truncate text-sm font-semibold text-[hsl(var(--text-primary))]">
          {stage}
        </span>
        {staleness !== 'none' && (
          <span
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              staleness === 'red' ? 'bg-red-500' : 'bg-yellow-500',
            )}
            title={staleness === 'red' ? 'Batch stuck >7 days' : 'Batch stuck >3 days'}
          />
        )}
        <Badge variant="outline" className="text-xs">
          {batches.length}
        </Badge>

        {/* Owner chips */}
        {stageOwners.length > 0 && (
          <TooltipProvider>
            <div className="flex items-center -space-x-1">
              {displayOwners.map((email) => (
                <Tooltip key={email}>
                  <TooltipTrigger asChild>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] text-[10px] font-semibold text-[hsl(var(--text-primary))]">
                      {initials(email)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{email}</TooltipContent>
                </Tooltip>
              ))}
              {extraCount > 0 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] text-[10px] font-semibold text-[hsl(var(--text-tertiary))]">
                  +{extraCount}
                </span>
              )}
            </div>
          </TooltipProvider>
        )}

        {isAdmin && (
          <Popover open={ownerPopoverOpen} onOpenChange={setOwnerPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))]"
                aria-label="Assign team to stage"
                onClick={(e) => {
                  e.stopPropagation();
                  openOwnerPopover();
                }}
              >
                <UserPlus className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="end" onClick={(e) => e.stopPropagation()}>
              <Command>
                <CommandInput placeholder="Search people..." />
                <CommandEmpty>No people found.</CommandEmpty>
                <CommandGroup className="max-h-52 overflow-y-auto">
                  {allEmails.map((email) => (
                    <CommandItem key={email} onSelect={() => toggleEmail(email)}>
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          pendingOwners.includes(email) ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      {email}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
              <div className="flex items-center justify-between border-t border-[hsl(var(--border))] px-3 py-2">
                <span className="text-xs text-[hsl(var(--text-tertiary))]">
                  {pendingOwners.length} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setOwnerPopoverOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    disabled={savingOwners}
                    onClick={() => void saveOwners()}
                  >
                    {savingOwners ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))]"
          aria-label={`Collapse ${stage} column`}
          onClick={() => onCollapsedChange(true)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Droppable body */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-3 transition-colors',
          isOver && 'bg-[hsl(var(--surface-raised))]',
        )}
      >
        {batches.length === 0 ? (
          <p className="py-4 text-center text-xs text-[hsl(var(--text-tertiary))]">No batches</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed.

- [ ] **Step 3: Commit**

```bash
git add components/assembly/board-column.tsx
git commit -m "feat: add BoardColumn component with droppable body and collapsed rail"
```

---

## Task 8: Create `BoardView` Component

The board root. Owns the `DndContext`, the shared readiness dialog, and the drag-end handler that either fires moves directly (backward) or runs the readiness gate (forward). Collapsed-state is lifted to `AssemblyClient` (wired in Task 9) so the pipeline-summary tile click can reach it.

**Files:**
- Create: `components/assembly/board-view.tsx`

- [ ] **Step 1: Create `components/assembly/board-view.tsx`**

```tsx
'use client';

import { useCallback, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BoardColumn } from './board-column';
import { BoardBatchCard } from './board-batch-card';
import { isProductReady } from './batch-helpers';
import {
  ASSEMBLY_STAGES,
  type AssemblyBatch,
  type AssemblyResponse,
  type AssemblyStage,
  type TourProduct,
} from '@/lib/types';

type PendingBatchMove = {
  batch: AssemblyBatch;
  targetStage: AssemblyStage;
  readyProducts: TourProduct[];
  notReadyCount: number;
};

interface BoardViewProps {
  assemblyData: AssemblyResponse;
  products: TourProduct[];
  movingBatchId: string | null;
  movingProductRowIndex: number | null;
  isAdmin: boolean;
  owners: Partial<Record<AssemblyStage, string[]>>;
  allEmails: string[];
  collapsed: Record<AssemblyStage, boolean>;
  onCollapsedChange: (stage: AssemblyStage, value: boolean) => void;
  onOwnersChange: (stage: AssemblyStage, emails: string[]) => Promise<void>;
  onBatchMoveToStage: (batch: AssemblyBatch, target: AssemblyStage) => Promise<void>;
  onMoveProductToNextStage: (product: TourProduct, batch: AssemblyBatch) => Promise<void>;
  onProductClick: (product: TourProduct) => void;
  onRemoveBatch: (batchId: string) => Promise<void>;
  onRemoveProduct: (rowIndex: number) => Promise<void>;
}

export function BoardView({
  assemblyData,
  products,
  movingBatchId,
  movingProductRowIndex,
  isAdmin,
  owners,
  allEmails,
  collapsed,
  onCollapsedChange,
  onOwnersChange,
  onBatchMoveToStage,
  onMoveProductToNextStage,
  onProductClick,
  onRemoveBatch,
  onRemoveProduct,
}: BoardViewProps) {
  const [activeBatch, setActiveBatch] = useState<AssemblyBatch | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingBatchMove | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const runBatchMove = useCallback(
    (batch: AssemblyBatch, targetStage: AssemblyStage) => {
      if (batch.stage === targetStage) return;
      const sourceIndex = ASSEMBLY_STAGES.indexOf(batch.stage);
      const targetIndex = ASSEMBLY_STAGES.indexOf(targetStage);
      if (targetIndex < sourceIndex) {
        // Backward move — no readiness check.
        void onBatchMoveToStage(batch, targetStage);
        return;
      }
      // Forward move — run readiness gate.
      const batchProducts = products.filter((p) => batch.productRowIndexes.includes(p.rowIndex));
      const readyProducts = batchProducts.filter((p) => isProductReady(p, batch.stage));
      const notReadyCount = batchProducts.length - readyProducts.length;
      if (notReadyCount === 0) {
        void onBatchMoveToStage(batch, targetStage);
        return;
      }
      setPendingMove({ batch, targetStage, readyProducts, notReadyCount });
    },
    [onBatchMoveToStage, products],
  );

  const confirmPendingMove = async () => {
    if (!pendingMove) return;
    if (pendingMove.readyProducts.length === 0) {
      setPendingMove(null);
      return;
    }
    const filtered: AssemblyBatch = {
      ...pendingMove.batch,
      productRowIndexes: pendingMove.readyProducts.map((p) => p.rowIndex),
    };
    await onBatchMoveToStage(filtered, pendingMove.targetStage);
    setPendingMove(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { batch?: AssemblyBatch } | undefined;
    setActiveBatch(data?.batch ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveBatch(null);
    const { active, over } = event;
    if (!over) return;
    const batch = (active.data.current as { batch?: AssemblyBatch } | undefined)?.batch;
    const targetStage = (over.data.current as { stage?: AssemblyStage } | undefined)?.stage;
    if (!batch || !targetStage) return;
    runBatchMove(batch, targetStage);
  };

  const isNoneReady = pendingMove?.readyProducts.length === 0;

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-2" style={{ minHeight: '60vh' }}>
          {ASSEMBLY_STAGES.map((stage) => {
            const batches = assemblyData[stage]?.batches ?? [];
            return (
              <BoardColumn
                key={stage}
                stage={stage}
                batches={batches}
                isAdmin={isAdmin}
                stageOwners={owners[stage] ?? []}
                allEmails={allEmails}
                collapsed={collapsed[stage]}
                onCollapsedChange={(c) => onCollapsedChange(stage, c)}
                onOwnersChange={(emails) => onOwnersChange(stage, emails)}
              >
                {batches.map((batch) => (
                  <BoardBatchCard
                    key={batch._id}
                    batch={batch}
                    products={products}
                    isAdmin={isAdmin}
                    isMoving={movingBatchId === batch._id}
                    movingProductRowIndex={movingProductRowIndex}
                    onRequestMove={runBatchMove}
                    onMoveProductToNextStage={onMoveProductToNextStage}
                    onProductClick={onProductClick}
                    onRemoveBatch={onRemoveBatch}
                    onRemoveProduct={onRemoveProduct}
                  />
                ))}
              </BoardColumn>
            );
          })}
        </div>

        <DragOverlay>
          {activeBatch ? (
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm font-medium shadow-lg">
              {activeBatch.name}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Batch readiness dialog (forward moves only) */}
      <Dialog open={pendingMove !== null} onOpenChange={(open) => { if (!open) setPendingMove(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move batch</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-[hsl(var(--text-secondary))]">
            {isNoneReady ? (
              <p>
                No products in this batch are ready to be moved to{' '}
                <span className="font-medium text-[hsl(var(--text-primary))]">
                  {pendingMove?.targetStage}
                </span>
                .
              </p>
            ) : (
              <p>
                <span className="font-medium text-[hsl(var(--text-primary))]">
                  {pendingMove?.notReadyCount}
                </span>{' '}
                product{pendingMove?.notReadyCount !== 1 ? 's are' : ' is'} not ready and will be skipped.
                Only{' '}
                <span className="font-medium text-[hsl(var(--text-primary))]">
                  {pendingMove?.readyProducts.length}
                </span>{' '}
                ready product{pendingMove?.readyProducts.length !== 1 ? 's' : ''} will be moved to{' '}
                <span className="font-medium text-[hsl(var(--text-primary))]">
                  {pendingMove?.targetStage}
                </span>
                .
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingMove(null)}>
              Cancel
            </Button>
            {!isNoneReady && (
              <Button onClick={() => void confirmPendingMove()}>Move ready products</Button>
            )}
            {isNoneReady && (
              <Button variant="outline" onClick={() => setPendingMove(null)}>
                OK
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 2: Verify lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed.

- [ ] **Step 3: Commit**

```bash
git add components/assembly/board-view.tsx
git commit -m "feat: add BoardView with DnD context and readiness gate"
```

---

## Task 9: Wire Toggle and Board into `AssemblyClient`

Render the toggle next to the tab list, branch on view, and update the pipeline-tile click handler so board mode scrolls horizontally and uncollapses the target column.

**Files:**
- Modify: `app/(app)/assembly/assembly-client.tsx`

- [ ] **Step 1: Add imports at the top of `assembly-client.tsx`**

Add the following imports alongside the existing ones:

```ts
import { BoardView } from '@/components/assembly/board-view';
import { AssemblyViewToggle } from '@/components/assembly/assembly-view-toggle';
import { useAssemblyView } from '@/lib/hooks/use-assembly-view';
```

- [ ] **Step 2: Use the hook inside `AssemblyClient`**

Near the top of the component (after the other `useState` calls, before `handleStageCollapsedChange`):

```ts
const { view, storedView, boardAvailable, setView } = useAssemblyView();
```

- [ ] **Step 3: Add lifted board-collapsed state and handler**

Ensure `useEffect` is imported alongside the existing `useState` / `useCallback` imports at the top of `assembly-client.tsx`. Then add the following inside `AssemblyClient`, next to the existing `collapsedStages` state:

```ts
const [boardCollapsed, setBoardCollapsed] = useState<Record<AssemblyStage, boolean>>(
  () => Object.fromEntries(ASSEMBLY_STAGES.map((s) => [s, false])) as Record<AssemblyStage, boolean>,
);

useEffect(() => {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem('assembly:board:collapsed');
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<Record<AssemblyStage, boolean>>;
    setBoardCollapsed((prev) => {
      const next = { ...prev };
      for (const stage of ASSEMBLY_STAGES) {
        if (typeof parsed[stage] === 'boolean') next[stage] = parsed[stage] as boolean;
      }
      return next;
    });
  } catch {
    // Ignore quota / parse errors; fall back to defaults.
  }
}, []);

const handleBoardCollapsedChange = useCallback((stage: AssemblyStage, value: boolean) => {
  setBoardCollapsed((prev) => {
    const next = { ...prev, [stage]: value };
    try {
      window.localStorage.setItem('assembly:board:collapsed', JSON.stringify(next));
    } catch {
      // Ignore.
    }
    return next;
  });
}, []);
```

- [ ] **Step 4: Replace `handlePipelineStageTileClick` to branch on view**

Replace the existing `handlePipelineStageTileClick` with:

```ts
const handlePipelineStageTileClick = useCallback(
  (stage: AssemblyStage) => {
    if (view === 'board') {
      handleBoardCollapsedChange(stage, false);
      setTimeout(() => {
        document
          .getElementById(`board-col-${stage}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }, 80);
      return;
    }
    setCollapsedStages((prev) => ({ ...prev, [stage]: false }));
    setTimeout(() => {
      document.getElementById(`stage-${stage}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  },
  [view, handleBoardCollapsedChange],
);
```

- [ ] **Step 5: Render the toggle and branch on view**

Replace the `<Tabs defaultValue="current">` block in `assembly-client.tsx` with:

```tsx
<Tabs defaultValue="current">
  <div className="flex items-center justify-between gap-2">
    <TabsList>
      <TabsTrigger value="current">Assembly Line</TabsTrigger>
      <TabsTrigger value="archived" className="gap-1.5">
        Archived
        {archivedCount > 0 && (
          <Badge variant="secondary" className="ml-1 text-xs">{archivedCount}</Badge>
        )}
      </TabsTrigger>
    </TabsList>
    {boardAvailable && (
      <AssemblyViewToggle view={storedView} onChange={setView} />
    )}
  </div>

  <TabsContent value="current" className="mt-4">
    {assemblyLoading ? (
      <div className="space-y-3">
        {ASSEMBLY_STAGES.map((stage) => (
          <div key={stage} className="h-14 animate-pulse rounded-lg bg-[hsl(var(--surface))]" />
        ))}
      </div>
    ) : view === 'board' && assemblyData ? (
      <BoardView
        assemblyData={assemblyData}
        products={products ?? []}
        movingBatchId={movingBatchId}
        movingProductRowIndex={movingProductRowIndex}
        isAdmin={isAdmin}
        owners={owners}
        allEmails={allEmails}
        collapsed={boardCollapsed}
        onCollapsedChange={handleBoardCollapsedChange}
        onOwnersChange={handleOwnersChange}
        onBatchMoveToStage={handleBatchMoveToStage}
        onMoveProductToNextStage={(product, batch) => handleProductMoveToNextStage(product, batch)}
        onProductClick={(product) => setSelectedProduct(product)}
        onRemoveBatch={handleRemoveBatch}
        onRemoveProduct={handleRemoveProduct}
      />
    ) : (
      <div className="space-y-3">
        {ASSEMBLY_STAGES.map((stage) => (
          <StageSection
            key={stage}
            stage={stage}
            batches={assemblyData?.[stage]?.batches ?? []}
            products={products ?? []}
            movingBatchId={movingBatchId}
            movingProductRowIndex={movingProductRowIndex}
            isAdmin={isAdmin}
            collapsed={collapsedStages[stage]}
            onCollapsedChange={(c) => handleStageCollapsedChange(stage, c)}
            stageOwners={owners[stage] ?? []}
            allEmails={allEmails}
            onOwnersChange={(emails) => handleOwnersChange(stage, emails)}
            onBatchMoveToNextStage={handleBatchMoveToNextStage}
            onBatchMoveToStage={handleBatchMoveToStage}
            onMoveProductToNextStage={(product, batch) =>
              handleProductMoveToNextStage(product, batch)
            }
            onProductClick={(product) => setSelectedProduct(product)}
            onRemoveBatch={handleRemoveBatch}
            onRemoveProduct={handleRemoveProduct}
          />
        ))}
      </div>
    )}
  </TabsContent>

  <TabsContent value="archived" className="mt-4">
    {/* unchanged — leave the existing archived block intact */}
  </TabsContent>
</Tabs>
```

(Preserve the existing archived `TabsContent` contents exactly as they are — only the "current" tab is modified.)

- [ ] **Step 6: Verify lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed.

- [ ] **Step 7: Commit**

```bash
git add app/\(app\)/assembly/assembly-client.tsx
git commit -m "feat: wire assembly board view toggle into assembly client"
```

---

## Task 10: Manual Verification Pass

No code changes — this is a smoke test against the running app. If anything fails, file a follow-up fix as a new commit before marking complete.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Navigate to `http://localhost:3000/assembly` and sign in.

- [ ] **Step 2: Toggle persistence**

Click the board view button → board renders. Reload the page → board still showing. Click list view → list renders. Reload → list still showing.

- [ ] **Step 3: Viewport gating**

Resize window below 768px. Confirm the toggle disappears and the view falls back to list automatically. Resize back above 768px → toggle reappears and the last-selected view is restored.

- [ ] **Step 4: Drag-and-drop (forward, all ready)**

With a batch whose products are all ready for the next stage, drag it to the next stage's column. Expected: no dialog, card moves, `/api/assembly` revalidates, toast "Moved batch ... to ..." fires.

- [ ] **Step 5: Drag-and-drop (forward, some not ready)**

Drag a batch with at least one not-ready product to a forward stage. Expected: readiness dialog opens with "X product(s) not ready and will be skipped. Only Y ready product(s) will be moved to Z." Click "Move ready products" → move fires with only ready products; card stays in source column with remaining not-ready products.

- [ ] **Step 6: Drag-and-drop (forward, none ready)**

Drag a batch with zero ready products to a forward stage. Expected: dialog says "No products in this batch are ready" and shows only an OK button.

- [ ] **Step 7: Drag-and-drop (backward)**

Drag a batch to an earlier stage. Expected: no dialog, move fires immediately.

- [ ] **Step 8: Keyboard DnD**

Tab to a batch card's drag handle (grip icon). Press Space to pick up, arrow keys to navigate between columns, Space to drop, Escape to cancel. Verify dnd-kit announcements in the live region.

- [ ] **Step 9: Column collapse + drag-over auto-expand**

Collapse a column via the chevron. Reload page — collapsed state persists. Drag a batch over the collapsed rail — column auto-expands mid-drag. Drop onto the expanded column; move fires normally.

- [ ] **Step 10: Pipeline tile click in board mode**

Collapse the "Selling Price" column. Click the Selling Price tile in the Pipeline Summary above. Expected: column uncollapses and board scrolls so that column is centered.

- [ ] **Step 11: Column header parity**

Admins: confirm assign-owner button opens popover; save owners; chips appear on column header; reload — chips still appear. Non-admins: confirm no assign-owner button, no trash buttons on cards.

- [ ] **Step 12: Batch card expand and product table**

Click "Show N products" on a card. Confirm the product table renders identically to list view (same columns, same rendering, same actions). Click a product row → detail sheet opens. Per-product Move works with readiness dialog. Admin trash icon works with remove dialog.

- [ ] **Step 13: Archived tab**

Switch to Archived tab → toggle is not shown (or is ignored). Archived content still renders as list view regardless of stored view.

- [ ] **Step 14: Move failure recovery**

In dev tools, block `POST /api/assembly/move`. Drag a batch. Expected: toast error, card returns to source column after SWR revalidation, no crash.

- [ ] **Step 15: Final checks**

```bash
npm run lint
npm run build
```

Both must succeed.

- [ ] **Step 16: Commit (if any fixes were needed)**

If any regressions surfaced during steps 1-14 and were fixed in new commits, they are already committed. If no follow-up fixes were needed, there is no commit for this task — mark it complete and move on.

---

## Rollout

Single PR to master. Default view remains `list`, so existing users see no change until they opt in. No feature flag needed. To revert, `git revert` the merge commit — the changes are additive and localized.
