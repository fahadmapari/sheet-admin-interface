# Assembly Line Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pipeline visibility (staleness badges + summary bar) and multi-person stage ownership to the assembly line.

**Architecture:** Backend adds `movedToStageAt` to batch documents and a new `stageconfig` singleton collection for per-stage owner arrays. Frontend adds a `PipelineSummary` bar above the tabs, staleness badges on `BatchCard`, and ownership chips + edit popover on `StageSection`. Collapse state for stages is lifted to `AssemblyClient` so the summary bar can expand a section on click.

**Tech Stack:** Next.js 15 App Router, TypeScript, MongoDB (via `lib/mongodb.ts`), SWR, shadcn/ui (Popover, Command, Badge, Button, Tooltip)

---

## File Map

| File | Change |
|------|--------|
| `lib/types.ts` | Add `movedToStageAt?: string` to `AssemblyBatch`; add `StageConfig` interface |
| `app/api/assembly/route.ts` | Include `movedToStageAt` in GET response |
| `app/api/assembly/move/route.ts` | Set `movedToStageAt: new Date()` on insert and update |
| `app/api/assembly/stage-config/route.ts` | **New** — GET + PATCH for stage owner config |
| `components/assembly/pipeline-summary.tsx` | **New** — horizontal tile bar showing counts + staleness per stage |
| `components/assembly/batch-card.tsx` | Replace `createdAt` date label with `Xd in stage` staleness badge |
| `components/assembly/stage-section.tsx` | Accept `collapsed`/`onCollapsedChange` props (remove internal state); add owner chips + edit popover |
| `app/(app)/assembly/assembly-client.tsx` | Lift collapse state; add SWR for stage-config + access-control; render `PipelineSummary` |

---

## Task 1: Update Types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add `movedToStageAt` to `AssemblyBatch` and add `StageConfig`**

In `lib/types.ts`, find the `AssemblyBatch` interface and add the optional field, then add the `StageConfig` interface after it:

```ts
export interface AssemblyBatch {
  _id: string;
  name: string;
  stage: AssemblyStage;
  productRowIndexes: number[];
  createdAt: string;
  uploadedAt?: string;
  movedToStageAt?: string; // ISO timestamp — when batch last entered its current stage
}

// (add after AssemblyBatch, before ProductAssemblyInfo)
export interface StageConfig {
  owners: Partial<Record<AssemblyStage, string[]>>;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -40
```

Expected: no new type errors (existing errors, if any, are unrelated to this change).

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add movedToStageAt to AssemblyBatch and StageConfig type"
```

---

## Task 2: Include `movedToStageAt` in GET `/api/assembly`

**Files:**
- Modify: `app/api/assembly/route.ts`

- [ ] **Step 1: Add `movedToStageAt` to the batch mapping**

Replace the `.map()` call in `app/api/assembly/route.ts`:

```ts
.map((b) => ({
  _id: b._id.toString(),
  name: b.name as string,
  stage: b.stage as AssemblyStage,
  productRowIndexes: b.productRowIndexes as number[],
  createdAt: (b.createdAt as Date).toISOString(),
  ...(b.uploadedAt && { uploadedAt: (b.uploadedAt as Date).toISOString() }),
  ...(b.movedToStageAt && { movedToStageAt: (b.movedToStageAt as Date).toISOString() }),
})),
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -40
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/assembly/route.ts
git commit -m "feat: include movedToStageAt in assembly GET response"
```

---

## Task 3: Set `movedToStageAt` in Move Route

**Files:**
- Modify: `app/api/assembly/move/route.ts`

- [ ] **Step 1: Add `movedToStageAt: new Date()` to all write paths**

In `app/api/assembly/move/route.ts`, there are three write paths. Update each:

**Path A — existing batch (line ~54, `col.updateOne` for `type: 'existing'`):**

```ts
await col.updateOne(
  { _id: targetBatchId },
  {
    $addToSet: { productRowIndexes: { $each: rowIndexes } } as Document,
    $set: { movedToStageAt: new Date(), ...(targetStage === 'Uploaded' ? { uploadedAt: new Date() } : {}) },
  },
);
```

**Path B — update existing batch found by name+stage (line ~64, second `col.updateOne`):**

```ts
await col.updateOne(
  { _id: existing._id },
  {
    $addToSet: { productRowIndexes: { $each: rowIndexes } } as Document,
    $set: { movedToStageAt: new Date(), ...(targetStage === 'Uploaded' ? { uploadedAt: new Date() } : {}) },
  },
);
```

**Path C — insert new batch (line ~73, `col.insertOne`):**

```ts
const res = await col.insertOne({
  name: batchName,
  stage: targetStage,
  productRowIndexes: rowIndexes,
  createdAt: new Date(),
  movedToStageAt: new Date(),
  ...(targetStage === 'Uploaded' && { uploadedAt: new Date() }),
});
```

Remove the separate `uploadedAtUpdate` object since `uploadedAt` is now inlined per path. Delete the line:
```ts
const uploadedAtUpdate = targetStage === 'Uploaded' ? { $set: { uploadedAt: new Date() } } : {};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -40
```

- [ ] **Step 3: Commit**

```bash
git add app/api/assembly/move/route.ts
git commit -m "feat: set movedToStageAt on batch creation and stage transition"
```

---

## Task 4: Create Stage-Config API Route

**Files:**
- Create: `app/api/assembly/stage-config/route.ts`

- [ ] **Step 1: Create the route file**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { getDb } from '@/lib/mongodb';
import { ASSEMBLY_STAGES, type AssemblyStage, type StageConfig } from '@/lib/types';

export const dynamic = 'force-dynamic';

const COLLECTION = 'stageconfig';
const SINGLETON_ID = 'singleton';

async function getStageConfig(): Promise<StageConfig> {
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ _id: SINGLETON_ID as unknown });
  if (!doc) return { owners: {} };
  return { owners: (doc.owners ?? {}) as StageConfig['owners'] };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const config = await getStageConfig();
    return NextResponse.json(config);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(session.user.email))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await req.json()) as { stage: AssemblyStage; emails: string[] };
    if (!ASSEMBLY_STAGES.includes(body.stage) || !Array.isArray(body.emails)) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const db = await getDb();
    await db.collection(COLLECTION).updateOne(
      { _id: SINGLETON_ID as unknown },
      { $set: { [`owners.${body.stage}`]: body.emails } },
      { upsert: true },
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | head -40
```

- [ ] **Step 3: Commit**

```bash
git add app/api/assembly/stage-config/route.ts
git commit -m "feat: add stage-config API route for GET and PATCH stage owners"
```

---

## Task 5: Create `PipelineSummary` Component

**Files:**
- Create: `components/assembly/pipeline-summary.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { ASSEMBLY_STAGES, type AssemblyResponse, type AssemblyStage } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PipelineSummaryProps {
  assemblyData: AssemblyResponse;
  onStageClick: (stage: AssemblyStage) => void;
}

function getDaysInStage(batch: { movedToStageAt?: string; createdAt: string }): number {
  const ref = batch.movedToStageAt ?? batch.createdAt;
  return (Date.now() - new Date(ref).getTime()) / 86_400_000;
}

function getStageStaleness(batches: { movedToStageAt?: string; createdAt: string }[]): 'red' | 'yellow' | 'none' {
  let worst: 'red' | 'yellow' | 'none' = 'none';
  for (const b of batches) {
    const days = getDaysInStage(b);
    if (days > 7) return 'red';
    if (days > 3) worst = 'yellow';
  }
  return worst;
}

export function PipelineSummary({ assemblyData, onStageClick }: PipelineSummaryProps) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {ASSEMBLY_STAGES.map((stage) => {
        const stageData = assemblyData[stage];
        const totalProducts = stageData.batches.reduce((s, b) => s + b.productRowIndexes.length, 0);
        const staleness = stage !== 'Uploaded' ? getStageStaleness(stageData.batches) : 'none';

        return (
          <button
            key={stage}
            type="button"
            onClick={() => onStageClick(stage)}
            className={cn(
              'flex flex-col gap-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2.5 text-left transition-colors hover:bg-[hsl(var(--surface-raised))]',
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-xs font-medium text-[hsl(var(--text-secondary))]">{stage}</span>
              {staleness !== 'none' && (
                <span
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    staleness === 'red' ? 'bg-red-500' : 'bg-yellow-500',
                  )}
                  title={staleness === 'red' ? 'Batch stuck >7 days' : 'Batch stuck >3 days'}
                />
              )}
            </div>
            <span className="text-sm font-semibold text-[hsl(var(--text-primary))]">{totalProducts}</span>
            <span className="text-xs text-[hsl(var(--text-tertiary))]">
              {totalProducts === 1 ? 'product' : 'products'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | head -40
```

- [ ] **Step 3: Commit**

```bash
git add components/assembly/pipeline-summary.tsx
git commit -m "feat: add PipelineSummary component"
```

---

## Task 6: Add Staleness Badge to `BatchCard`

**Files:**
- Modify: `components/assembly/batch-card.tsx`

- [ ] **Step 1: Add `getDaysInStage` helper and replace date label**

At the top of the component (after existing imports), add a helper:

```ts
function getDaysInStage(batch: AssemblyBatch): number {
  const ref = batch.movedToStageAt ?? batch.createdAt;
  return (Date.now() - new Date(ref).getTime()) / 86_400_000;
}
```

Then replace the `dateLabel` variable and its JSX. Find:

```tsx
const dateLabel = new Date(batch.createdAt).toLocaleDateString(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});
```

Replace with:

```tsx
const daysInStage = getDaysInStage(batch);
const showStaleness = batch.stage !== 'Uploaded';
```

Find the `dateLabel` usage in the JSX:

```tsx
<span className="hidden text-xs text-[hsl(var(--text-tertiary))] sm:inline">{dateLabel}</span>
```

Replace with:

```tsx
{showStaleness && daysInStage >= 3 && (
  <span
    className={cn(
      'hidden text-xs font-medium sm:inline',
      daysInStage > 7 ? 'text-red-500' : 'text-yellow-600 dark:text-yellow-400',
    )}
  >
    {Math.floor(daysInStage)}d in stage
  </span>
)}
{(!showStaleness || daysInStage < 3) && (
  <span className="hidden text-xs text-[hsl(var(--text-tertiary))] sm:inline">
    {new Date(batch.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
  </span>
)}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | head -40
```

- [ ] **Step 3: Start dev server and check**

```bash
npm run dev
```

Open `http://localhost:3000/assembly`. Expand a batch — verify the date label is shown (< 3 days) or the staleness badge appears. For a quick visual test, temporarily set `daysInStage >= 3` to `daysInStage >= 0` to force the badge to always show, confirm red/yellow colors, then revert.

- [ ] **Step 4: Commit**

```bash
git add components/assembly/batch-card.tsx
git commit -m "feat: add staleness badge to batch card"
```

---

## Task 7: Add Ownership to `StageSection`

**Files:**
- Modify: `components/assembly/stage-section.tsx`

- [ ] **Step 1: Update props interface and remove internal collapse state**

Replace the current `StageSectionProps` and component signature. The component will now receive `collapsed` and `onCollapsedChange` from the parent, and also receive owner data:

```tsx
'use client';

import { useState } from 'react';
import { Check, ChevronDown, ChevronRight, UserPlus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
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
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  stageOwners: string[];
  allEmails: string[];
  onOwnersChange: (emails: string[]) => Promise<void>;
  onBatchMoveToNextStage: (batch: AssemblyBatch) => Promise<void>;
  onBatchMoveToStage: (batch: AssemblyBatch, targetStage: AssemblyStage) => Promise<void>;
  onMoveProductToNextStage: (product: TourProduct, batch: AssemblyBatch) => Promise<void>;
  onProductClick: (product: TourProduct) => void;
  onRemoveBatch: (batchId: string) => Promise<void>;
  onRemoveProduct: (rowIndex: number) => Promise<void>;
}
```

- [ ] **Step 2: Implement the full updated component body**

Replace the entire `StageSection` function with:

```tsx
export function StageSection({
  stage,
  batches,
  products,
  movingBatchId,
  movingProductRowIndex,
  isAdmin,
  readOnly = false,
  collapsed,
  onCollapsedChange,
  stageOwners,
  allEmails,
  onOwnersChange,
  onBatchMoveToNextStage,
  onBatchMoveToStage,
  onMoveProductToNextStage,
  onProductClick,
  onRemoveBatch,
  onRemoveProduct,
}: StageSectionProps) {
  const [ownerPopoverOpen, setOwnerPopoverOpen] = useState(false);
  const [pendingOwners, setPendingOwners] = useState<string[]>([]);
  const [savingOwners, setSavingOwners] = useState(false);

  const totalProducts = batches.reduce((sum, b) => sum + b.productRowIndexes.length, 0);

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

  const initials = (email: string) => {
    const parts = email.split('@')[0].split(/[._-]/);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  };

  const displayOwners = stageOwners.slice(0, 3);
  const extraCount = stageOwners.length - 3;

  return (
    <div id={`stage-${stage}`} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
      <div className="flex items-center gap-2 px-5 py-4">
        <button
          className="flex flex-1 items-center gap-3 text-left"
          onClick={() => onCollapsedChange(!collapsed)}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--text-tertiary))]" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-[hsl(var(--text-tertiary))]" />
          )}
          <span className="flex-1 text-sm font-semibold text-[hsl(var(--text-primary))]">{stage}</span>
          <Badge variant="outline" className="text-xs">
            {totalProducts} product{totalProducts !== 1 ? 's' : ''}
          </Badge>
        </button>

        {/* Owner chips */}
        {!readOnly && (
          <div className="flex items-center gap-1">
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
                    onClick={(e) => { e.stopPropagation(); openOwnerPopover(); }}
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
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOwnerPopoverOpen(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" className="h-7 text-xs" disabled={savingOwners} onClick={() => void saveOwners()}>
                        {savingOwners ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}
      </div>

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

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | head -40
```

Expected: type errors in `AssemblyClient` because `StageSection` now requires new props — that is fine, Task 8 fixes them.

- [ ] **Step 4: Commit**

```bash
git add components/assembly/stage-section.tsx
git commit -m "feat: add ownership chips and edit popover to StageSection"
```

---

## Task 8: Wire Everything in `AssemblyClient`

**Files:**
- Modify: `app/(app)/assembly/assembly-client.tsx`

- [ ] **Step 1: Replace the full file contents**

```tsx
'use client';

import { useCallback, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { Layers } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StageSection } from '@/components/assembly/stage-section';
import { PipelineSummary } from '@/components/assembly/pipeline-summary';
import { ProductDetailSheet } from '@/components/products/product-detail-sheet';
import { fetcher } from '@/lib/fetcher';
import {
  ASSEMBLY_STAGES,
  type AssemblyBatch,
  type AssemblyResponse,
  type AssemblyStage,
  type StageConfig,
  type TourProduct,
} from '@/lib/types';

interface ArchivedResponse {
  batches: AssemblyBatch[];
}

interface AccessControlDoc {
  allowAll: boolean;
  allowedEmails: string[];
  adminEmails: string[];
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

  const { data: stageConfig, mutate: mutateStageConfig } = useSWR<StageConfig>(
    '/api/assembly/stage-config',
    fetcher,
    { dedupingInterval: 60_000 },
  );

  const { data: accessControl } = useSWR<AccessControlDoc>(
    isAdmin ? '/api/access-control' : null,
    fetcher,
    { dedupingInterval: 300_000 },
  );

  const allEmails = isAdmin && accessControl
    ? [...new Set([...accessControl.allowedEmails, ...accessControl.adminEmails])]
    : [];

  const [selectedProduct, setSelectedProduct] = useState<TourProduct | null>(null);
  const [movingBatchId, setMovingBatchId] = useState<string | null>(null);
  const [movingProductRowIndex, setMovingProductRowIndex] = useState<number | null>(null);

  const [collapsedStages, setCollapsedStages] = useState<Record<AssemblyStage, boolean>>(
    () => Object.fromEntries(ASSEMBLY_STAGES.map((s) => [s, false])) as Record<AssemblyStage, boolean>,
  );

  const handleStageCollapsedChange = useCallback((stage: AssemblyStage, collapsed: boolean) => {
    setCollapsedStages((prev) => ({ ...prev, [stage]: collapsed }));
  }, []);

  const handlePipelineStageTileClick = useCallback((stage: AssemblyStage) => {
    setCollapsedStages((prev) => ({ ...prev, [stage]: false }));
    setTimeout(() => {
      document.getElementById(`stage-${stage}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, []);

  const handleOwnersChange = useCallback(async (stage: AssemblyStage, emails: string[]) => {
    await fetch('/api/assembly/stage-config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage, emails }),
    });
    await mutateStageConfig();
  }, [mutateStageConfig]);

  const getNextStage = (stage: AssemblyStage): AssemblyStage | null => {
    const currentIndex = ASSEMBLY_STAGES.indexOf(stage);
    if (currentIndex === -1 || currentIndex >= ASSEMBLY_STAGES.length - 1) return null;
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
      if (!moveRes.ok) { toast.error('Batch move failed'); return; }
      toast.success(`Moved batch "${batch.name}" to "${targetStage}"`);
      mutate('/api/assembly');
      if (targetStage === 'Ready for Upload') mutate('/api/products');
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
      if (!moveRes.ok) { toast.error('Move failed'); return; }
      toast.success(`Moved product to "${nextStage}"`);
      mutate('/api/assembly');
      if (nextStage === 'Ready for Upload') mutate('/api/products');
    } finally {
      setMovingProductRowIndex(null);
    }
  };

  const handleRemoveBatch = async (batchId: string) => {
    const res = await fetch(`/api/assembly/${batchId}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Failed to remove batch'); return; }
    toast.success('Batch removed from assembly');
    mutate('/api/assembly');
  };

  const handleRemoveProduct = async (rowIndex: number) => {
    const res = await fetch(`/api/assembly/product/${rowIndex}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Failed to remove product'); return; }
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
  const owners = stageConfig?.owners ?? {};

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

      {assemblyData && (
        <PipelineSummary
          assemblyData={assemblyData}
          onStageClick={handlePipelineStageTileClick}
        />
      )}

      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">Assembly Line</TabsTrigger>
          <TabsTrigger value="archived" className="gap-1.5">
            Archived
            {archivedCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{archivedCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-4">
          {assemblyLoading ? (
            <div className="space-y-3">
              {ASSEMBLY_STAGES.map((stage) => (
                <div key={stage} className="h-14 animate-pulse rounded-lg bg-[hsl(var(--surface))]" />
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
                products={products ?? []}
                movingBatchId={null}
                movingProductRowIndex={null}
                isAdmin={false}
                readOnly={true}
                collapsed={false}
                onCollapsedChange={() => {}}
                stageOwners={[]}
                allEmails={[]}
                onOwnersChange={async () => {}}
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
        onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}
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

- [ ] **Step 2: Verify TypeScript build passes cleanly**

```bash
npm run build 2>&1 | head -60
```

Expected: 0 type errors.

- [ ] **Step 3: Start dev server and do a full manual check**

```bash
npm run dev
```

Open `http://localhost:3000/assembly` and verify:

1. Pipeline summary bar shows 6 tiles with correct product counts
2. Clicking a tile scrolls to and expands the corresponding stage section
3. Batch cards show staleness badge (yellow/red) for old batches; clean date for recent ones
4. Stage sections show owner chips if owners are assigned
5. Admin users: clicking the `+` icon opens owner picker, selecting emails and saving updates the chips
6. Non-admin users: no `+` button visible
7. Archived tab still works correctly

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/assembly/assembly-client.tsx
git commit -m "feat: wire PipelineSummary, staleness, and stage ownership into AssemblyClient"
```
