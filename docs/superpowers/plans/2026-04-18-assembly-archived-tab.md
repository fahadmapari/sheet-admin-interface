# Assembly Line — Archived Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Archived" tab to the Assembly Line page that shows "Uploaded" batches older than 7 days, keeping the active workflow view clean.

**Architecture:** A new `GET /api/assembly/archived` endpoint queries MongoDB for old "Uploaded" batches. The main `GET /api/assembly` is updated to exclude them. A new `readOnly` prop on `StageSection`/`BatchCard` suppresses all action buttons. `assembly-client.tsx` gains a second SWR hook and shadcn `Tabs` wrapping the two views.

**Tech Stack:** Next.js 15 App Router, MongoDB, SWR, shadcn/ui Tabs

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Modify | `lib/types.ts` | Add `uploadedAt?: string` to `AssemblyBatch` |
| Modify | `lib/constants.ts` | Add `ARCHIVE_THRESHOLD_MS` constant |
| Modify | `app/api/assembly/move/route.ts` | Set `uploadedAt` when moving to "Uploaded" |
| Modify | `app/api/assembly/route.ts` | Exclude archived batches; include `uploadedAt` in response |
| Create | `app/api/assembly/archived/route.ts` | New endpoint: returns archived batches |
| Modify | `components/assembly/batch-card.tsx` | Add `readOnly?: boolean`; hide action buttons when true |
| Modify | `components/assembly/stage-section.tsx` | Add `readOnly?: boolean`; pass it to BatchCard |
| Modify | `app/(app)/assembly/assembly-client.tsx` | Add Tabs + second SWR hook for archived data |

---

## Task 1: Add `uploadedAt` type field and archive threshold constant

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/constants.ts`

- [ ] **Step 1: Add `uploadedAt` to `AssemblyBatch` in `lib/types.ts`**

  Find the `AssemblyBatch` interface (currently around line 167) and add the optional field:

  ```ts
  export interface AssemblyBatch {
    _id: string;
    name: string;
    stage: AssemblyStage;
    productRowIndexes: number[];
    createdAt: string;
    uploadedAt?: string;
  }
  ```

- [ ] **Step 2: Add `ARCHIVE_THRESHOLD_MS` to `lib/constants.ts`**

  Append after the last export in the file:

  ```ts
  export const ARCHIVE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  Run: `npm run build 2>&1 | head -30`

  Expected: no new type errors (build may have other unrelated warnings — that's OK, just confirm no errors from the two files you touched).

- [ ] **Step 4: Commit**

  ```bash
  git add lib/types.ts lib/constants.ts
  git commit -m "feat: add uploadedAt field to AssemblyBatch and archive threshold constant"
  ```

---

## Task 2: Set `uploadedAt` in the move API

**Files:**
- Modify: `app/api/assembly/move/route.ts`

- [ ] **Step 1: Add the `uploadedAt` import and update all three batch resolution paths**

  Replace the entire file content with:

  ```ts
  import { NextRequest, NextResponse } from 'next/server';
  import { fanOutNotifications } from '@/lib/notifications';
  import { ObjectId, type Document } from 'mongodb';
  import { getDb } from '@/lib/mongodb';
  import { ASSEMBLY_STAGES, type AssemblyStage } from '@/lib/types';

  export const dynamic = 'force-dynamic';

  interface MoveBody {
    rowIndexes: number[];
    targetStage: AssemblyStage;
    batchStrategy:
      | { type: 'new'; name?: string }
      | { type: 'existing'; batchId: string };
  }

  function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  export async function POST(req: NextRequest) {
    try {
      const body = (await req.json()) as MoveBody;
      const { rowIndexes, targetStage, batchStrategy } = body;

      if (!Array.isArray(rowIndexes) || rowIndexes.length === 0) {
        return NextResponse.json({ error: 'rowIndexes must be a non-empty array' }, { status: 400 });
      }
      if (!ASSEMBLY_STAGES.includes(targetStage)) {
        return NextResponse.json({ error: 'Invalid targetStage' }, { status: 400 });
      }

      const db = await getDb();
      const col = db.collection('assembly_batches');

      // 1. Remove rowIndexes from any current batch
      await col.updateMany(
        { productRowIndexes: { $in: rowIndexes } },
        { $pull: { productRowIndexes: { $in: rowIndexes } } as Document },
      );

      // 2. Delete empty batches
      await col.deleteMany({ productRowIndexes: { $size: 0 } });

      const uploadedAtUpdate = targetStage === 'Uploaded' ? { $set: { uploadedAt: new Date() } } : {};

      // 3. Resolve target batch
      let targetBatchId: ObjectId = new ObjectId();

      if (batchStrategy.type === 'existing') {
        targetBatchId = new ObjectId(batchStrategy.batchId);
        await col.updateOne(
          { _id: targetBatchId },
          {
            $addToSet: { productRowIndexes: { $each: rowIndexes } } as Document,
            ...uploadedAtUpdate,
          },
        );
      } else {
        const batchName = batchStrategy.name ?? todayIso();
        const existing = await col.findOne({ stage: targetStage, name: batchName });

        if (existing) {
          await col.updateOne(
            { _id: existing._id },
            {
              $addToSet: { productRowIndexes: { $each: rowIndexes } } as Document,
              ...uploadedAtUpdate,
            },
          );
          targetBatchId = existing._id;
        } else {
          const res = await col.insertOne({
            name: batchName,
            stage: targetStage,
            productRowIndexes: rowIndexes,
            createdAt: new Date(),
            ...(targetStage === 'Uploaded' && { uploadedAt: new Date() }),
          });
          targetBatchId = res.insertedId;
        }
      }

      // 4. Sync sheet if target is "Ready for Upload"
      if (targetStage === 'Ready for Upload') {
        const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
        const sheetRes = await fetch(`${baseUrl}/api/products/bulk`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rowIndexes, field: 'readyForUpload', value: 'TRUE' }),
        });
        if (!sheetRes.ok) {
          console.warn('[assembly/move] Sheet sync failed for "Ready for Upload":', await sheetRes.text());
        }
      }

      // Fan out notifications (fire-and-forget)
      try {
        const movedBatch = await col.findOne({ _id: targetBatchId });
        await fanOutNotifications({
          batchId: targetBatchId.toString(),
          batchName: movedBatch?.name ?? '',
          productCount: rowIndexes.length,
          targetStage,
        });
      } catch (notifErr) {
        console.warn('[assembly/move] Notification fan-out failed:', notifErr);
      }

      return NextResponse.json({ ok: true, batchId: targetBatchId.toString() });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  Run: `npm run build 2>&1 | head -30`

  Expected: no errors in `app/api/assembly/move/route.ts`.

- [ ] **Step 3: Commit**

  ```bash
  git add app/api/assembly/move/route.ts
  git commit -m "feat: record uploadedAt timestamp when batch moves to Uploaded stage"
  ```

---

## Task 3: Filter archived batches from main assembly GET

**Files:**
- Modify: `app/api/assembly/route.ts`

- [ ] **Step 1: Update the GET handler to exclude archived batches and include `uploadedAt`**

  Replace the entire file:

  ```ts
  import { NextResponse } from 'next/server';
  import { getDb } from '@/lib/mongodb';
  import { ARCHIVE_THRESHOLD_MS } from '@/lib/constants';
  import { ASSEMBLY_STAGES, type AssemblyResponse, type AssemblyStage } from '@/lib/types';

  export const dynamic = 'force-dynamic';

  export async function GET() {
    try {
      const db = await getDb();
      const batches = await db
        .collection('assembly_batches')
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      const now = Date.now();

      const result = Object.fromEntries(
        ASSEMBLY_STAGES.map((stage) => [
          stage,
          {
            batches: batches
              .filter((b) => {
                if (b.stage !== stage) return false;
                if (stage !== 'Uploaded') return true;
                const ageRef = b.uploadedAt ?? b.createdAt;
                return now - new Date(ageRef).getTime() <= ARCHIVE_THRESHOLD_MS;
              })
              .map((b) => ({
                _id: b._id.toString(),
                name: b.name as string,
                stage: b.stage as AssemblyStage,
                productRowIndexes: b.productRowIndexes as number[],
                createdAt: (b.createdAt as Date).toISOString(),
                ...(b.uploadedAt && { uploadedAt: (b.uploadedAt as Date).toISOString() }),
              })),
          },
        ]),
      ) as AssemblyResponse;

      return NextResponse.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  Run: `npm run build 2>&1 | head -30`

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add app/api/assembly/route.ts
  git commit -m "feat: exclude archived Uploaded batches from assembly GET response"
  ```

---

## Task 4: Create the archived endpoint

**Files:**
- Create: `app/api/assembly/archived/route.ts`

- [ ] **Step 1: Create the file**

  Create `app/api/assembly/archived/route.ts`:

  ```ts
  import { NextResponse } from 'next/server';
  import { getDb } from '@/lib/mongodb';
  import { ARCHIVE_THRESHOLD_MS } from '@/lib/constants';
  import type { AssemblyBatch } from '@/lib/types';

  export const dynamic = 'force-dynamic';

  export async function GET() {
    try {
      const db = await getDb();
      const cutoff = new Date(Date.now() - ARCHIVE_THRESHOLD_MS);

      const allUploaded = await db
        .collection('assembly_batches')
        .find({ stage: 'Uploaded' })
        .sort({ createdAt: -1 })
        .toArray();

      const batches: AssemblyBatch[] = allUploaded
        .filter((b) => {
          const ageRef = b.uploadedAt ?? b.createdAt;
          return new Date(ageRef) < cutoff;
        })
        .map((b) => ({
          _id: b._id.toString(),
          name: b.name as string,
          stage: 'Uploaded',
          productRowIndexes: b.productRowIndexes as number[],
          createdAt: (b.createdAt as Date).toISOString(),
          ...(b.uploadedAt && { uploadedAt: (b.uploadedAt as Date).toISOString() }),
        }));

      return NextResponse.json({ batches });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  Run: `npm run build 2>&1 | head -30`

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add app/api/assembly/archived/route.ts
  git commit -m "feat: add GET /api/assembly/archived endpoint for old Uploaded batches"
  ```

---

## Task 5: Add `readOnly` prop to `BatchCard`

**Files:**
- Modify: `components/assembly/batch-card.tsx`

- [ ] **Step 1: Add `readOnly` to `BatchCardProps` and guard action buttons**

  Make the following targeted changes to `components/assembly/batch-card.tsx`:

  **a) Add `readOnly?: boolean` to the interface (after `isAdmin`):**

  Old:
  ```ts
  interface BatchCardProps {
    batch: AssemblyBatch;
    products: TourProduct[];
    isMoving: boolean;
    movingProductRowIndex: number | null;
    isAdmin: boolean;
    onMoveToNextStage: (batch: AssemblyBatch) => Promise<void>;
    onMoveToStage: (batch: AssemblyBatch, targetStage: AssemblyStage) => Promise<void>;
    onMoveProductToNextStage: (product: TourProduct) => Promise<void>;
    onProductClick: (product: TourProduct) => void;
    onRemoveBatch: (batchId: string) => Promise<void>;
    onRemoveProduct: (rowIndex: number) => Promise<void>;
  }
  ```

  New:
  ```ts
  interface BatchCardProps {
    batch: AssemblyBatch;
    products: TourProduct[];
    isMoving: boolean;
    movingProductRowIndex: number | null;
    isAdmin: boolean;
    readOnly?: boolean;
    onMoveToNextStage: (batch: AssemblyBatch) => Promise<void>;
    onMoveToStage: (batch: AssemblyBatch, targetStage: AssemblyStage) => Promise<void>;
    onMoveProductToNextStage: (product: TourProduct) => Promise<void>;
    onProductClick: (product: TourProduct) => void;
    onRemoveBatch: (batchId: string) => Promise<void>;
    onRemoveProduct: (rowIndex: number) => Promise<void>;
  }
  ```

  **b) Destructure `readOnly` in the function signature (after `isAdmin`):**

  Old:
  ```ts
  export function BatchCard({
    batch,
    products,
    isMoving,
    movingProductRowIndex,
    isAdmin,
    onMoveToNextStage,
  ```

  New:
  ```ts
  export function BatchCard({
    batch,
    products,
    isMoving,
    movingProductRowIndex,
    isAdmin,
    readOnly = false,
    onMoveToNextStage,
  ```

  **c) Guard the batch-level move button + dropdown — change the condition from `{nextStage ? (` to `{nextStage && !readOnly ? (`:**

  Old:
  ```tsx
          {nextStage ? (
            <div className="ml-2 flex">
  ```

  New:
  ```tsx
          {nextStage && !readOnly ? (
            <div className="ml-2 flex">
  ```

  **d) Guard the batch-level remove button — change `{isAdmin && (` to `{isAdmin && !readOnly && (`:**

  Old:
  ```tsx
          {isAdmin && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-1 h-8 w-8 text-[hsl(var(--text-tertiary))] hover:text-destructive"
              aria-label="Remove batch"
  ```

  New:
  ```tsx
          {isAdmin && !readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-1 h-8 w-8 text-[hsl(var(--text-tertiary))] hover:text-destructive"
              aria-label="Remove batch"
  ```

  **e) Guard the per-product move column header — change `{nextStage && (` (the "Move" `<th>`) to `{nextStage && !readOnly && (`:**

  Old:
  ```tsx
                      {nextStage && (
                        <th className="py-1.5 pl-3 text-right text-xs font-medium text-[hsl(var(--text-tertiary))]">
                          Move
                        </th>
                      )}
                      {isAdmin && (
                        <th className="py-1.5 pl-2 text-right text-xs font-medium text-[hsl(var(--text-tertiary))]" />
                      )}
  ```

  New:
  ```tsx
                      {nextStage && !readOnly && (
                        <th className="py-1.5 pl-3 text-right text-xs font-medium text-[hsl(var(--text-tertiary))]">
                          Move
                        </th>
                      )}
                      {isAdmin && !readOnly && (
                        <th className="py-1.5 pl-2 text-right text-xs font-medium text-[hsl(var(--text-tertiary))]" />
                      )}
  ```

  **f) Guard per-product move cell — change `{nextStage && (` (the `<td>` with per-product Move button) to `{nextStage && !readOnly && (`:**

  Old:
  ```tsx
                          {nextStage && (
                            <td className="py-2 pl-3 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                disabled={isThisProductMoving || isMoving}
                                onClick={(e) => handleProductMoveClick(product, e)}
                              >
                                <ArrowRight className="mr-1 h-3 w-3" />
                                {isThisProductMoving ? '...' : 'Move'}
                              </Button>
                            </td>
                          )}
                          {isAdmin && (
                            <td className="py-2 pl-2 text-right">
  ```

  New:
  ```tsx
                          {nextStage && !readOnly && (
                            <td className="py-2 pl-3 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                disabled={isThisProductMoving || isMoving}
                                onClick={(e) => handleProductMoveClick(product, e)}
                              >
                                <ArrowRight className="mr-1 h-3 w-3" />
                                {isThisProductMoving ? '...' : 'Move'}
                              </Button>
                            </td>
                          )}
                          {isAdmin && !readOnly && (
                            <td className="py-2 pl-2 text-right">
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  Run: `npm run build 2>&1 | head -30`

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add components/assembly/batch-card.tsx
  git commit -m "feat: add readOnly prop to BatchCard, hide action buttons when true"
  ```

---

## Task 6: Add `readOnly` prop to `StageSection`

**Files:**
- Modify: `components/assembly/stage-section.tsx`

- [ ] **Step 1: Add `readOnly` to props and pass it to each `BatchCard`**

  Replace the entire file:

  ```ts
  'use client';

  import { useState } from 'react';
  import { ChevronDown, ChevronRight } from 'lucide-react';
  import { Badge } from '@/components/ui/badge';
  import { BatchCard } from './batch-card';
  import type { AssemblyBatch, AssemblyStage, TourProduct } from '@/lib/types';

  interface StageSectionProps {
    stage: AssemblyStage;
    batches: AssemblyBatch[];
    products: TourProduct[];
    movingBatchId: string | null;
    movingProductRowIndex: number | null;
    isAdmin: boolean;
    readOnly?: boolean;
    onBatchMoveToNextStage: (batch: AssemblyBatch) => Promise<void>;
    onBatchMoveToStage: (batch: AssemblyBatch, targetStage: AssemblyStage) => Promise<void>;
    onMoveProductToNextStage: (product: TourProduct, batch: AssemblyBatch) => Promise<void>;
    onProductClick: (product: TourProduct) => void;
    onRemoveBatch: (batchId: string) => Promise<void>;
    onRemoveProduct: (rowIndex: number) => Promise<void>;
  }

  export function StageSection({
    stage,
    batches,
    products,
    movingBatchId,
    movingProductRowIndex,
    isAdmin,
    readOnly = false,
    onBatchMoveToNextStage,
    onBatchMoveToStage,
    onMoveProductToNextStage,
    onProductClick,
    onRemoveBatch,
    onRemoveProduct,
  }: StageSectionProps) {
    const [collapsed, setCollapsed] = useState(false);
    const totalProducts = batches.reduce((sum, b) => sum + b.productRowIndexes.length, 0);

    return (
      <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
        <button
          className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-[hsl(var(--surface-raised))] transition-colors rounded-lg"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--text-tertiary))]" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-[hsl(var(--text-tertiary))]" />
          )}
          <span className="flex-1 text-sm font-semibold text-[hsl(var(--text-primary))]">
            {stage}
          </span>
          <Badge variant="outline" className="text-xs">
            {totalProducts} product{totalProducts !== 1 ? 's' : ''}
          </Badge>
        </button>

        {!collapsed && (
          <div className="border-t border-[hsl(var(--border))] px-5 py-3 space-y-2">
            {batches.length === 0 ? (
              <p className="py-2 text-sm text-[hsl(var(--text-tertiary))]">No batches in this stage.</p>
            ) : (
              batches.map((batch) => (
                <BatchCard
                  key={batch._id}
                  batch={batch}
                  products={products}
                  isMoving={movingBatchId === batch._id}
                  movingProductRowIndex={movingProductRowIndex}
                  isAdmin={isAdmin}
                  readOnly={readOnly}
                  onMoveToNextStage={onBatchMoveToNextStage}
                  onMoveToStage={onBatchMoveToStage}
                  onMoveProductToNextStage={(product) => onMoveProductToNextStage(product, batch)}
                  onProductClick={onProductClick}
                  onRemoveBatch={onRemoveBatch}
                  onRemoveProduct={onRemoveProduct}
                />
              ))
            )}
          </div>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  Run: `npm run build 2>&1 | head -30`

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add components/assembly/stage-section.tsx
  git commit -m "feat: add readOnly prop to StageSection, propagate to BatchCard"
  ```

---

## Task 7: Add Tabs and archived view to `assembly-client.tsx`

**Files:**
- Modify: `app/(app)/assembly/assembly-client.tsx`

- [ ] **Step 1: Replace the file with the tabbed version**

  ```ts
  'use client';

  import { useState } from 'react';
  import useSWR, { useSWRConfig } from 'swr';
  import { Layers } from 'lucide-react';
  import { toast } from 'sonner';
  import { Badge } from '@/components/ui/badge';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
  import { StageSection } from '@/components/assembly/stage-section';
  import { ProductDetailSheet } from '@/components/products/product-detail-sheet';
  import { fetcher } from '@/lib/fetcher';
  import {
    ASSEMBLY_STAGES,
    type AssemblyBatch,
    type AssemblyResponse,
    type AssemblyStage,
    type TourProduct,
  } from '@/lib/types';

  interface ArchivedResponse {
    batches: AssemblyBatch[];
  }

  export function AssemblyClient({ isAdmin }: { isAdmin: boolean }) {
    const { mutate } = useSWRConfig();
    const { data: assemblyData, error: assemblyError, isLoading: assemblyLoading } =
      useSWR<AssemblyResponse>('/api/assembly', fetcher, { dedupingInterval: 10_000 });

    const { data: archivedData, isLoading: archivedLoading } =
      useSWR<ArchivedResponse>('/api/assembly/archived', fetcher, { dedupingInterval: 60_000 });

    const { data: products } = useSWR<TourProduct[]>('/api/products', fetcher, {
      dedupingInterval: 60_000,
    });

    const [selectedProduct, setSelectedProduct] = useState<TourProduct | null>(null);
    const [movingBatchId, setMovingBatchId] = useState<string | null>(null);
    const [movingProductRowIndex, setMovingProductRowIndex] = useState<number | null>(null);

    const getNextStage = (stage: AssemblyStage): AssemblyStage | null => {
      const currentIndex = ASSEMBLY_STAGES.indexOf(stage);
      if (currentIndex === -1 || currentIndex >= ASSEMBLY_STAGES.length - 1) {
        return null;
      }
      return ASSEMBLY_STAGES[currentIndex + 1];
    };

    const moveBatchToStage = async (batch: AssemblyBatch, targetStage: AssemblyStage) => {
      setMovingBatchId(batch._id);
      try {
        const moveRes = await fetch('/api/assembly/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rowIndexes: batch.productRowIndexes,
            targetStage,
            batchStrategy: { type: 'new', name: batch.name },
          }),
        });

        if (!moveRes.ok) {
          toast.error('Batch move failed');
          return;
        }

        toast.success(`Moved batch "${batch.name}" to "${targetStage}"`);
        mutate('/api/assembly');
        if (targetStage === 'Ready for Upload') {
          mutate('/api/products');
        }
      } finally {
        setMovingBatchId(null);
      }
    };

    const handleBatchMoveToNextStage = async (batch: AssemblyBatch) => {
      const nextStage = getNextStage(batch.stage);
      if (!nextStage) return;
      await moveBatchToStage(batch, nextStage);
    };

    const handleBatchMoveToStage = async (batch: AssemblyBatch, targetStage: AssemblyStage) => {
      await moveBatchToStage(batch, targetStage);
    };

    const handleProductMoveToNextStage = async (product: TourProduct, batch: AssemblyBatch) => {
      const nextStage = getNextStage(batch.stage);
      if (!nextStage) return;

      setMovingProductRowIndex(product.rowIndex);
      try {
        const moveRes = await fetch('/api/assembly/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rowIndexes: [product.rowIndex],
            targetStage: nextStage,
            batchStrategy: { type: 'new', name: batch.name },
          }),
        });

        if (!moveRes.ok) {
          toast.error('Move failed');
          return;
        }

        toast.success(`Moved product to "${nextStage}"`);
        mutate('/api/assembly');
        if (nextStage === 'Ready for Upload') {
          mutate('/api/products');
        }
      } finally {
        setMovingProductRowIndex(null);
      }
    };

    const handleRemoveBatch = async (batchId: string) => {
      const res = await fetch(`/api/assembly/${batchId}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('Failed to remove batch');
        return;
      }
      toast.success('Batch removed from assembly');
      mutate('/api/assembly');
    };

    const handleRemoveProduct = async (rowIndex: number) => {
      const res = await fetch(`/api/assembly/product/${rowIndex}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('Failed to remove product');
        return;
      }
      toast.success('Product removed from assembly');
      mutate('/api/assembly');
    };

    if (assemblyError) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/15 dark:text-red-300">
          Failed to load assembly data: {assemblyError.message ?? 'Unknown error'}
        </div>
      );
    }

    const archivedCount = archivedData?.batches.length ?? 0;

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Layers className="h-5 w-5" />
            Assembly Line
          </h1>
          <p className="mt-1 text-sm text-[hsl(var(--text-secondary))]">
            Track products through production stages.
          </p>
        </div>

        <Tabs defaultValue="current">
          <TabsList>
            <TabsTrigger value="current">Assembly Line</TabsTrigger>
            <TabsTrigger value="archived" className="gap-1.5">
              Archived
              {archivedCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {archivedCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="mt-4">
            {assemblyLoading ? (
              <div className="space-y-3">
                {ASSEMBLY_STAGES.map((stage) => (
                  <div
                    key={stage}
                    className="h-14 animate-pulse rounded-lg bg-[hsl(var(--surface))]"
                  />
                ))}
              </div>
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
            {archivedLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-[hsl(var(--surface))]" />
                ))}
              </div>
            ) : archivedCount === 0 ? (
              <p className="py-6 text-center text-sm text-[hsl(var(--text-tertiary))]">
                No archived batches yet. Batches move here after spending more than 7 days in Uploaded.
              </p>
            ) : (
              <div className="space-y-3">
                <StageSection
                  stage="Uploaded"
                  batches={archivedData?.batches ?? []}
                  products={[]}
                  movingBatchId={null}
                  movingProductRowIndex={null}
                  isAdmin={false}
                  readOnly={true}
                  onBatchMoveToNextStage={async () => {}}
                  onBatchMoveToStage={async () => {}}
                  onMoveProductToNextStage={async () => {}}
                  onProductClick={() => {}}
                  onRemoveBatch={async () => {}}
                  onRemoveProduct={async () => {}}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        <ProductDetailSheet
          product={selectedProduct}
          open={selectedProduct !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedProduct(null);
          }}
          onSaved={(product) => {
            setSelectedProduct(product);
            mutate('/api/products');
            mutate('/api/assembly');
          }}
        />
      </div>
    );
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

  Run: `npm run build 2>&1 | head -50`

  Expected: successful build with no errors.

- [ ] **Step 3: Start dev server and manually verify**

  Run: `npm run dev`

  Check:
  - Assembly Line page loads and shows two tabs: "Assembly Line" and "Archived"
  - "Assembly Line" tab works exactly as before (all stage sections, move/remove buttons visible)
  - "Archived" tab shows the count badge on the trigger if `archivedCount > 0`
  - "Archived" tab shows the empty state message if no archived batches exist
  - "Uploaded" batches older than 7 days no longer appear in the "Assembly Line" tab

- [ ] **Step 4: Commit**

  ```bash
  git add app/\(app\)/assembly/assembly-client.tsx
  git commit -m "feat: add Archived tab to Assembly Line for old Uploaded batches"
  ```
