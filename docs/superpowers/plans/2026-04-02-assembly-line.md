# Assembly Line Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a MongoDB-backed assembly line page where products move through 6 ordered stages as batches, with move controls in the detail sheet, table 3-dots menu, and bulk actions toolbar.

**Architecture:** MongoDB stores `assembly_batches` documents (one per batch, embedding an array of product `rowIndex` values). Three Next.js API routes handle reads and writes. Four new components render the assembly page; three existing components are extended with move controls.

**Tech Stack:** Next.js 14 App Router, MongoDB (via `mongodb` npm package), TypeScript, Tailwind CSS, shadcn/ui (Radix UI), SWR, Lucide React, Sonner (toasts)

> **Note:** This project has no test runner configured. Each task includes a manual verification step instead of automated tests.

---

## File Map

**New files:**
- `lib/mongodb.ts` — MongoDB singleton client
- `app/api/assembly/route.ts` — GET all batches grouped by stage
- `app/api/assembly/move/route.ts` — POST move products to a stage
- `app/api/assembly/product/[rowIndex]/route.ts` — GET product's current stage
- `components/assembly/batch-card.tsx` — expandable batch card
- `components/assembly/stage-section.tsx` — collapsible stage section
- `components/assembly/move-to-stage-dialog.tsx` — bulk move dialog
- `app/assembly/assembly-client.tsx` — assembly page client component
- `app/assembly/page.tsx` — assembly page route entry

**Modified files:**
- `lib/types.ts` — add `AssemblyStage`, `AssemblyBatch`, `AssemblyStageData` types
- `components/layout/sidebar.tsx` — add "Assembly Line" nav item
- `components/products/product-table.tsx` — add `onMoveToNextStage` to `RowActionsMenu` + `ProductTable`
- `app/products/products-client.tsx` — wire up `onMoveToNextStage` handler
- `components/assembly/move-to-stage-dialog.tsx` — (new, used by bulk toolbar)
- `components/products/bulk-actions-toolbar.tsx` — add "Move to Stage" dropdown + dialog
- `components/products/product-detail-sheet.tsx` — add split-button move control

---

## Task 1: Install mongodb package

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install the mongodb driver**

```bash
cd e:/projects/sheet-admin && npm install mongodb
```

Expected: `added N packages` with no errors.

- [ ] **Step 2: Verify**

```bash
cd e:/projects/sheet-admin && node -e "require('mongodb'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
cd e:/projects/sheet-admin && git add package.json package-lock.json && git commit -m "chore: add mongodb driver"
```

---

## Task 2: Add assembly types to lib/types.ts

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Append types at the end of `lib/types.ts`**

Add the following after the last export in the file:

```ts
export const ASSEMBLY_STAGES = [
  'In Review',
  '2nd Review',
  'Buying Price',
  'Selling Price',
  'Ready for Upload',
  'Uploaded',
] as const;

export type AssemblyStage = (typeof ASSEMBLY_STAGES)[number];

export interface AssemblyBatch {
  _id: string;
  name: string;
  stage: AssemblyStage;
  productRowIndexes: number[];
  createdAt: string;
}

export type AssemblyStageData = {
  batches: AssemblyBatch[];
};

export type AssemblyResponse = Record<AssemblyStage, AssemblyStageData>;

export interface ProductAssemblyInfo {
  stage: AssemblyStage;
  batchId: string;
  batchName: string;
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (clean) or only pre-existing errors unrelated to types.ts.

- [ ] **Step 3: Commit**

```bash
cd e:/projects/sheet-admin && git add lib/types.ts && git commit -m "feat: add AssemblyStage and AssemblyBatch types"
```

---

## Task 3: Create MongoDB singleton client

**Files:**
- Create: `lib/mongodb.ts`

- [ ] **Step 1: Create `lib/mongodb.ts`**

```ts
import 'server-only';
import { MongoClient, type Db } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('Missing MONGODB_URI environment variable');
}

// In development, use a global to preserve the connection across HMR reloads.
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri).connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = new MongoClient(uri).connect();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db('sheet-admin');
}
```

- [ ] **Step 2: Add MONGODB_URI to `.env.local`**

Open `.env.local` and add:

```
MONGODB_URI=your-mongodb-connection-string
```

(The user will replace this with their actual URI.)

- [ ] **Step 3: Verify TypeScript**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit 2>&1 | head -20
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
cd e:/projects/sheet-admin && git add lib/mongodb.ts && git commit -m "feat: add MongoDB singleton client"
```

---

## Task 4: API — GET /api/assembly

**Files:**
- Create: `app/api/assembly/route.ts`

- [ ] **Step 1: Create `app/api/assembly/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
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

    const result = Object.fromEntries(
      ASSEMBLY_STAGES.map((stage) => [
        stage,
        {
          batches: batches
            .filter((b) => b.stage === stage)
            .map((b) => ({
              _id: b._id.toString(),
              name: b.name as string,
              stage: b.stage as AssemblyStage,
              productRowIndexes: b.productRowIndexes as number[],
              createdAt: (b.createdAt as Date).toISOString(),
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

- [ ] **Step 2: Verify TypeScript**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit 2>&1 | head -20
```

Expected: clean.

- [ ] **Step 3: Manual verification** (requires MONGODB_URI set in .env.local)

```bash
cd e:/projects/sheet-admin && npm run dev &
# then in another terminal:
curl http://localhost:3000/api/assembly
```

Expected: JSON with 6 keys (one per stage), each with `{ batches: [] }`.

- [ ] **Step 4: Commit**

```bash
cd e:/projects/sheet-admin && git add app/api/assembly/route.ts && git commit -m "feat: add GET /api/assembly endpoint"
```

---

## Task 5: API — GET /api/assembly/product/[rowIndex]

**Files:**
- Create: `app/api/assembly/product/[rowIndex]/route.ts`

- [ ] **Step 1: Create the directory and file**

Create `app/api/assembly/product/[rowIndex]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import type { AssemblyStage } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { rowIndex: string } },
) {
  const rowIndex = parseInt(params.rowIndex, 10);
  if (Number.isNaN(rowIndex)) {
    return NextResponse.json({ error: 'Invalid rowIndex' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const batch = await db
      .collection('assembly_batches')
      .findOne({ productRowIndexes: rowIndex });

    if (!batch) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      stage: batch.stage as AssemblyStage,
      batchId: batch._id.toString(),
      batchName: batch.name as string,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd e:/projects/sheet-admin && git add "app/api/assembly/product/[rowIndex]/route.ts" && git commit -m "feat: add GET /api/assembly/product/[rowIndex] endpoint"
```

---

## Task 6: API — POST /api/assembly/move

**Files:**
- Create: `app/api/assembly/move/route.ts`

- [ ] **Step 1: Create `app/api/assembly/move/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
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
      { $pull: { productRowIndexes: { $in: rowIndexes } } as never },
    );

    // 2. Delete empty batches
    await col.deleteMany({ productRowIndexes: { $size: 0 } });

    // 3. Resolve target batch
    let targetBatchId: ObjectId;

    if (batchStrategy.type === 'existing') {
      targetBatchId = new ObjectId(batchStrategy.batchId);
      await col.updateOne(
        { _id: targetBatchId },
        { $push: { productRowIndexes: { $each: rowIndexes } } as never },
      );
    } else {
      const batchName = batchStrategy.name ?? todayIso();

      // For unnamed new batches (single moves), reuse today's batch in target stage if it exists
      const shouldReuse = !batchStrategy.name;
      if (shouldReuse) {
        const existing = await col.findOne({ stage: targetStage, name: batchName });
        if (existing) {
          await col.updateOne(
            { _id: existing._id },
            { $push: { productRowIndexes: { $each: rowIndexes } } as never },
          );
          targetBatchId = existing._id;
        } else {
          const res = await col.insertOne({
            name: batchName,
            stage: targetStage,
            productRowIndexes: rowIndexes,
            createdAt: new Date(),
          });
          targetBatchId = res.insertedId;
        }
      } else {
        const res = await col.insertOne({
          name: batchName,
          stage: targetStage,
          productRowIndexes: rowIndexes,
          createdAt: new Date(),
        });
        targetBatchId = res.insertedId;
      }
    }

    // 4. Sync sheet if target is "Ready for Upload"
    if (targetStage === 'Ready for Upload') {
      const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
      await fetch(`${baseUrl}/api/products/bulk`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndexes, field: 'readyForUpload', value: 'TRUE' }),
      });
    }

    return NextResponse.json({ ok: true, batchId: targetBatchId.toString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Manual test** — with dev server running:

```bash
curl -X POST http://localhost:3000/api/assembly/move \
  -H "Content-Type: application/json" \
  -d '{"rowIndexes":[2],"targetStage":"In Review","batchStrategy":{"type":"new"}}'
```

Expected: `{"ok":true,"batchId":"..."}`. Then `curl http://localhost:3000/api/assembly` should show rowIndex 2 in "In Review".

- [ ] **Step 4: Commit**

```bash
cd e:/projects/sheet-admin && git add app/api/assembly/move/route.ts && git commit -m "feat: add POST /api/assembly/move endpoint"
```

---

## Task 7: BatchCard component

**Files:**
- Create: `components/assembly/batch-card.tsx`

- [ ] **Step 1: Create `components/assembly/batch-card.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AssemblyBatch, TourProduct } from '@/lib/types';

interface BatchCardProps {
  batch: AssemblyBatch;
  products: TourProduct[];
  onProductClick: (product: TourProduct) => void;
}

export function BatchCard({ batch, products, onProductClick }: BatchCardProps) {
  const [expanded, setExpanded] = useState(false);

  const batchProducts = products.filter((p) =>
    batch.productRowIndexes.includes(p.rowIndex),
  );

  const dateLabel = new Date(batch.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]">
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[hsl(var(--surface))] transition-colors rounded-lg"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-[hsl(var(--text-tertiary))]" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--text-tertiary))]" />
        )}
        <Package className="h-4 w-4 shrink-0 text-[hsl(var(--text-secondary))]" />
        <span className="flex-1 text-sm font-medium text-[hsl(var(--text-primary))]">
          {batch.name}
        </span>
        <span className="text-xs text-[hsl(var(--text-tertiary))]">{dateLabel}</span>
        <Badge variant="secondary" className="ml-2 text-xs">
          {batch.productRowIndexes.length}
        </Badge>
      </button>

      {expanded && (
        <div className="border-t border-[hsl(var(--border))] px-4 py-2">
          {batchProducts.length === 0 ? (
            <p className="py-2 text-sm text-[hsl(var(--text-tertiary))]">No products loaded.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  <th className="py-1.5 text-left text-xs font-medium text-[hsl(var(--text-tertiary))] pr-4">Product</th>
                  <th className="py-1.5 text-left text-xs font-medium text-[hsl(var(--text-tertiary))] pr-4">City</th>
                  <th className="py-1.5 text-left text-xs font-medium text-[hsl(var(--text-tertiary))] pr-4">Country</th>
                  <th className="py-1.5 text-left text-xs font-medium text-[hsl(var(--text-tertiary))]">Status</th>
                </tr>
              </thead>
              <tbody>
                {batchProducts.map((product) => (
                  <tr
                    key={product.rowIndex}
                    className={cn(
                      'cursor-pointer border-b border-[hsl(var(--border))] last:border-0',
                      'hover:bg-[hsl(var(--surface))] transition-colors',
                    )}
                    onClick={() => onProductClick(product)}
                  >
                    <td className="py-2 pr-4 font-medium text-[hsl(var(--text-primary))] max-w-[220px] truncate">
                      {product.productName || `${product.city}, ${product.country}`}
                    </td>
                    <td className="py-2 pr-4 text-[hsl(var(--text-secondary))]">{product.city}</td>
                    <td className="py-2 pr-4 text-[hsl(var(--text-secondary))]">{product.country}</td>
                    <td className="py-2">
                      {product.productStatus ? (
                        <Badge variant="outline" className="text-xs">{product.productStatus}</Badge>
                      ) : (
                        <span className="text-[hsl(var(--text-tertiary))]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd e:/projects/sheet-admin && git add components/assembly/batch-card.tsx && git commit -m "feat: add BatchCard component"
```

---

## Task 8: StageSection component

**Files:**
- Create: `components/assembly/stage-section.tsx`

- [ ] **Step 1: Create `components/assembly/stage-section.tsx`**

```tsx
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
  onProductClick: (product: TourProduct) => void;
}

export function StageSection({ stage, batches, products, onProductClick }: StageSectionProps) {
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
                onProductClick={onProductClick}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd e:/projects/sheet-admin && git add components/assembly/stage-section.tsx && git commit -m "feat: add StageSection component"
```

---

## Task 9: Assembly page

**Files:**
- Create: `app/assembly/assembly-client.tsx`
- Create: `app/assembly/page.tsx`

- [ ] **Step 1: Create `app/assembly/assembly-client.tsx`**

```tsx
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Layers } from 'lucide-react';
import { StageSection } from '@/components/assembly/stage-section';
import { ProductDetailSheet } from '@/components/products/product-detail-sheet';
import { fetcher } from '@/lib/fetcher';
import { ASSEMBLY_STAGES, type AssemblyResponse, type TourProduct } from '@/lib/types';
import { useSWRConfig } from 'swr';

export function AssemblyClient() {
  const { mutate } = useSWRConfig();
  const { data: assemblyData, error: assemblyError, isLoading: assemblyLoading } =
    useSWR<AssemblyResponse>('/api/assembly', fetcher, { dedupingInterval: 10_000 });

  const { data: products } = useSWR<TourProduct[]>('/api/products', fetcher, {
    dedupingInterval: 60_000,
  });

  const [selectedProduct, setSelectedProduct] = useState<TourProduct | null>(null);

  if (assemblyError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/15 dark:text-red-300">
        Failed to load assembly data: {assemblyError.message ?? 'Unknown error'}
      </div>
    );
  }

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
              onProductClick={(product) => setSelectedProduct(product)}
            />
          ))}
        </div>
      )}

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

- [ ] **Step 2: Create `app/assembly/page.tsx`**

```tsx
import { Suspense } from 'react';
import { AssemblyClient } from './assembly-client';

export default function AssemblyPage() {
  return (
    <Suspense fallback={null}>
      <AssemblyClient />
    </Suspense>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Manual verification** — navigate to `http://localhost:3000/assembly`. Should render the 6 stage sections.

- [ ] **Step 5: Commit**

```bash
cd e:/projects/sheet-admin && git add app/assembly/assembly-client.tsx app/assembly/page.tsx && git commit -m "feat: add assembly line page"
```

---

## Task 10: Add Assembly Line to sidebar

**Files:**
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Update `components/layout/sidebar.tsx`**

Add `Layers` to the import and insert the new nav item:

Change the import line from:
```ts
import { LayoutDashboard, Package, Settings } from 'lucide-react';
```
to:
```ts
import { LayoutDashboard, Layers, Package, Settings } from 'lucide-react';
```

Change the `navGroups` array from:
```ts
const navGroups = [
  {
    label: 'Workspace',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/products', label: 'Products', icon: Package },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
] as const;
```
to:
```ts
const navGroups = [
  {
    label: 'Workspace',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/products', label: 'Products', icon: Package },
      { href: '/assembly', label: 'Assembly Line', icon: Layers },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
] as const;
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Manual verification** — sidebar should now show "Assembly Line" link between Products and Settings.

- [ ] **Step 4: Commit**

```bash
cd e:/projects/sheet-admin && git add components/layout/sidebar.tsx && git commit -m "feat: add Assembly Line to sidebar navigation"
```

---

## Task 11: Add "Move to Next Stage" to table 3-dots menu

**Files:**
- Modify: `components/products/product-table.tsx`
- Modify: `app/products/products-client.tsx`

- [ ] **Step 1: Update `RowActionsMenu` in `product-table.tsx`**

Add `GitMerge` to the lucide import (or `ArrowRight` — use `ArrowRight`):

Change:
```ts
import { ChevronUp, ChevronDown, ChevronsUpDown, MoreHorizontal, ExternalLink } from 'lucide-react';
```
to:
```ts
import { ArrowRight, ChevronUp, ChevronDown, ChevronsUpDown, MoreHorizontal, ExternalLink } from 'lucide-react';
```

Change `RowActionsMenu` props interface and component:
```tsx
function RowActionsMenu({
  product,
  onDeleteRequest,
  onEditRequest,
  onMoveToNextStage,
}: {
  product: TourProduct;
  onDeleteRequest: (product: TourProduct) => void;
  onEditRequest: (product: TourProduct) => void;
  onMoveToNextStage: (product: TourProduct) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 transition-opacity group-hover/row:opacity-100"
          onClick={(e) => e.stopPropagation()}
          aria-label="Row actions"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEditRequest(product)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onMoveToNextStage(product);
          }}
        >
          <ArrowRight className="mr-2 h-3.5 w-3.5" />
          Move to Next Stage
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-red-700 focus:text-red-700 dark:text-red-300 dark:focus:text-red-300"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteRequest(product);
          }}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: Update `buildColumns` to accept and forward `onMoveToNextStage`**

Change:
```ts
function buildColumns(
  onDeleteRequest: (product: TourProduct) => void,
  onEditRequest: (product: TourProduct) => void,
): ColumnDef<TourProduct>[] {
```
to:
```ts
function buildColumns(
  onDeleteRequest: (product: TourProduct) => void,
  onEditRequest: (product: TourProduct) => void,
  onMoveToNextStage: (product: TourProduct) => void,
): ColumnDef<TourProduct>[] {
```

In the `actions` column cell, change:
```tsx
cell: ({ row }) => (
  <RowActionsMenu
    product={row.original}
    onDeleteRequest={onDeleteRequest}
    onEditRequest={onEditRequest}
  />
),
```
to:
```tsx
cell: ({ row }) => (
  <RowActionsMenu
    product={row.original}
    onDeleteRequest={onDeleteRequest}
    onEditRequest={onEditRequest}
    onMoveToNextStage={onMoveToNextStage}
  />
),
```

- [ ] **Step 3: Update `ProductTableProps` and `ProductTable`**

Add `onMoveToNextStage` to the interface:
```ts
interface ProductTableProps {
  data: TourProduct[];
  isLoading: boolean;
  error: unknown;
  rowSelection: RowSelectionState;
  onRowSelectionChange: (updater: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)) => void;
  onDeleteRequest: (product: TourProduct) => void;
  onEditRequest: (product: TourProduct) => void;
  onRowClick: (product: TourProduct) => void;
  onMoveToNextStage: (product: TourProduct) => void;
  columnVisibility?: VisibilityState;
}
```

Destructure it in `ProductTable`:
```ts
export function ProductTable({
  data,
  isLoading,
  error,
  rowSelection,
  onRowSelectionChange,
  onDeleteRequest,
  onEditRequest,
  onRowClick,
  onMoveToNextStage,
  columnVisibility = {},
}: ProductTableProps) {
```

Update the `useMemo` for columns:
```ts
const columns = useMemo(
  () => buildColumns(onDeleteRequest, onEditRequest, onMoveToNextStage),
  [onDeleteRequest, onEditRequest, onMoveToNextStage],
);
```

- [ ] **Step 4: Wire up handler in `app/products/products-client.tsx`**

Add the `ASSEMBLY_STAGES` import and a handler. At the top of the file, add to the `@/lib/types` import:
```ts
import type { TourProduct, AssemblyStage } from '@/lib/types';
import { ASSEMBLY_STAGES } from '@/lib/types';
```

Add the handler inside the `ProductsClient` function body (after the `useSWR` calls):
```ts
const handleMoveToNextStage = useCallback(async (product: TourProduct) => {
  // Get current stage
  const res = await fetch(`/api/assembly/product/${product.rowIndex}`);
  const info = res.ok ? await res.json() : null;

  const currentStage = info?.stage as AssemblyStage | undefined;
  const currentIndex = currentStage ? ASSEMBLY_STAGES.indexOf(currentStage) : -1;
  const nextStage: AssemblyStage =
    currentIndex === -1 || currentIndex >= ASSEMBLY_STAGES.length - 1
      ? ASSEMBLY_STAGES[0]
      : ASSEMBLY_STAGES[currentIndex + 1];

  const moveRes = await fetch('/api/assembly/move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rowIndexes: [product.rowIndex],
      targetStage: nextStage,
      batchStrategy: { type: 'new' },
    }),
  });

  if (moveRes.ok) {
    toast.success(`Moved to "${nextStage}"`);
  } else {
    toast.error('Move failed');
  }
}, []);
```

Pass it to `ProductTable`:
```tsx
<ProductTable
  data={searchedProducts}
  isLoading={isLoading}
  error={error}
  rowSelection={rowSelection}
  onRowSelectionChange={setRowSelection}
  onDeleteRequest={(product) => setDeleteTarget(product)}
  onEditRequest={(product) => setSelectedProduct(product)}
  onRowClick={(product) => setSelectedProduct(product)}
  onMoveToNextStage={handleMoveToNextStage}
  columnVisibility={columnVisibility}
/>
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Manual verification** — open the products table, click the 3-dots on a row, click "Move to Next Stage". Should see a toast and the product appear in the assembly page.

- [ ] **Step 7: Commit**

```bash
cd e:/projects/sheet-admin && git add components/products/product-table.tsx app/products/products-client.tsx && git commit -m "feat: add Move to Next Stage to table row actions"
```

---

## Task 12: MoveToStageDialog component (for bulk actions)

**Files:**
- Create: `components/assembly/move-to-stage-dialog.tsx`

- [ ] **Step 1: Create `components/assembly/move-to-stage-dialog.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetcher } from '@/lib/fetcher';
import { ASSEMBLY_STAGES, type AssemblyResponse, type AssemblyStage } from '@/lib/types';

interface MoveToStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetStage: AssemblyStage | null;
  onConfirm: (strategy: { type: 'new'; name: string } | { type: 'existing'; batchId: string }) => Promise<void>;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function MoveToStageDialog({
  open,
  onOpenChange,
  targetStage,
  onConfirm,
}: MoveToStageDialogProps) {
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [batchName, setBatchName] = useState(todayIso());
  const [existingBatchId, setExistingBatchId] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: assemblyData } = useSWR<AssemblyResponse>(
    open ? '/api/assembly' : null,
    fetcher,
  );

  const existingBatches = targetStage ? (assemblyData?.[targetStage]?.batches ?? []) : [];

  useEffect(() => {
    if (open) {
      setBatchName(todayIso());
      setMode('new');
      setExistingBatchId('');
    }
  }, [open]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (mode === 'new') {
        await onConfirm({ type: 'new', name: batchName });
      } else {
        await onConfirm({ type: 'existing', batchId: existingBatchId });
      }
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move to {targetStage}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <Button
              variant={mode === 'new' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('new')}
            >
              New batch
            </Button>
            <Button
              variant={mode === 'existing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('existing')}
              disabled={existingBatches.length === 0}
            >
              Add to existing
            </Button>
          </div>

          {mode === 'new' && (
            <div className="space-y-1.5">
              <Label htmlFor="batch-name">Batch name</Label>
              <Input
                id="batch-name"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="e.g. 2026-04-02"
              />
            </div>
          )}

          {mode === 'existing' && (
            <div className="space-y-1.5">
              <Label>Select batch</Label>
              <Select value={existingBatchId} onValueChange={setExistingBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a batch…" />
                </SelectTrigger>
                <SelectContent>
                  {existingBatches.map((b) => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.name} ({b.productRowIndexes.length} products)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              loading ||
              (mode === 'new' && !batchName.trim()) ||
              (mode === 'existing' && !existingBatchId)
            }
          >
            {loading ? 'Moving…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd e:/projects/sheet-admin && git add components/assembly/move-to-stage-dialog.tsx && git commit -m "feat: add MoveToStageDialog component"
```

---

## Task 13: Add "Move to Stage" to BulkActionsToolbar

**Files:**
- Modify: `components/products/bulk-actions-toolbar.tsx`

- [ ] **Step 1: Replace `components/products/bulk-actions-toolbar.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PIC_VALUES, PRODUCT_STATUSES } from '@/lib/constants';
import { ASSEMBLY_STAGES, type AssemblyStage, type TourProduct } from '@/lib/types';
import { DeleteConfirmDialog } from './delete-confirm-dialog';
import { MoveToStageDialog } from '@/components/assembly/move-to-stage-dialog';

interface BulkActionsToolbarProps {
  selectedProducts: TourProduct[];
  onClearSelection: () => void;
  onMutate: () => void;
}

export function BulkActionsToolbar({
  selectedProducts,
  onClearSelection,
  onMutate,
}: BulkActionsToolbarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveTargetStage, setMoveTargetStage] = useState<AssemblyStage | null>(null);

  if (selectedProducts.length === 0) return null;

  const applyBulkField = async (field: string, value: string) => {
    const rowIndexes = selectedProducts.map((p) => p.rowIndex);
    const res = await fetch('/api/products/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowIndexes, field, value }),
    });
    if (res.ok) {
      toast.success(`Updated ${rowIndexes.length} row${rowIndexes.length !== 1 ? 's' : ''}`);
      onMutate();
      onClearSelection();
    } else {
      toast.error('Bulk update failed');
    }
  };

  const handleBulkDelete = async () => {
    const rowIndexes = selectedProducts.map((p) => p.rowIndex);
    const res = await fetch('/api/products/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowIndexes }),
    });
    if (res.ok) {
      toast.success(`Deleted ${rowIndexes.length} row${rowIndexes.length !== 1 ? 's' : ''}`);
      onMutate();
      onClearSelection();
    } else {
      toast.error('Bulk delete failed');
    }
  };

  const handleStageSelect = (stage: AssemblyStage) => {
    setMoveTargetStage(stage);
    setMoveDialogOpen(true);
  };

  const handleMoveConfirm = async (
    strategy: { type: 'new'; name: string } | { type: 'existing'; batchId: string },
  ) => {
    const rowIndexes = selectedProducts.map((p) => p.rowIndex);
    const res = await fetch('/api/assembly/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rowIndexes,
        targetStage: moveTargetStage,
        batchStrategy: strategy,
      }),
    });
    if (res.ok) {
      toast.success(
        `Moved ${rowIndexes.length} product${rowIndexes.length !== 1 ? 's' : ''} to "${moveTargetStage}"`,
      );
      onMutate();
      onClearSelection();
    } else {
      toast.error('Move failed');
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2 animate-in slide-in-from-top-1 duration-150">
        <span className="shrink-0 text-sm font-medium text-[hsl(var(--text-primary))]">
          {selectedProducts.length} row{selectedProducts.length !== 1 ? 's' : ''} selected
        </span>

        <div className="mx-1 h-4 w-px bg-[hsl(var(--border))]" />

        <Select onValueChange={(value) => applyBulkField('pic', value)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Set PIC…" />
          </SelectTrigger>
          <SelectContent>
            {PIC_VALUES.map((pic) => (
              <SelectItem key={pic} value={pic}>
                {pic}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={(value) => applyBulkField('productStatus', value)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Set Status…" />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => applyBulkField('readyForUpload', 'TRUE')}
        >
          Mark Ready
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyBulkField('readyForUpload', 'FALSE')}
        >
          Unmark Ready
        </Button>

        <div className="mx-1 h-4 w-px bg-[hsl(var(--border))]" />

        <Select onValueChange={(value) => handleStageSelect(value as AssemblyStage)}>
          <SelectTrigger className="w-48">
            <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
            <SelectValue placeholder="Move to Stage…" />
          </SelectTrigger>
          <SelectContent>
            {ASSEMBLY_STAGES.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {stage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="mx-1 h-4 w-px bg-[hsl(var(--border))]" />

        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteDialogOpen(true)}
        >
          Delete
        </Button>

        <div className="ml-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearSelection}
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        count={selectedProducts.length}
        onConfirm={handleBulkDelete}
      />

      <MoveToStageDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        targetStage={moveTargetStage}
        onConfirm={handleMoveConfirm}
      />
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Manual verification** — select multiple rows in the products table, the bulk toolbar should show "Move to Stage…" dropdown. Selecting a stage should open the dialog.

- [ ] **Step 4: Commit**

```bash
cd e:/projects/sheet-admin && git add components/products/bulk-actions-toolbar.tsx && git commit -m "feat: add Move to Stage bulk action"
```

---

## Task 14: Add split-button move control to ProductDetailSheet

**Files:**
- Modify: `components/products/product-detail-sheet.tsx`

- [ ] **Step 1: Add imports and state to `product-detail-sheet.tsx`**

Change:
```ts
import { useEffect, useState } from 'react';
import { Check, Clock, ExternalLink, MapPin, Users, X } from 'lucide-react';
```
to:
```ts
import { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Clock, ExternalLink, MapPin, Users, X } from 'lucide-react';
```

Add the following imports after the existing imports:
```ts
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ASSEMBLY_STAGES, type AssemblyStage, type ProductAssemblyInfo } from '@/lib/types';
```

- [ ] **Step 2: Add assembly state and fetch inside `ProductDetailSheet`**

Inside the `ProductDetailSheet` function, add after the `draftProduct` state:

```ts
const [assemblyInfo, setAssemblyInfo] = useState<ProductAssemblyInfo | null | undefined>(undefined);
const [movingStage, setMovingStage] = useState(false);

useEffect(() => {
  if (!product?.rowIndex) {
    setAssemblyInfo(undefined);
    return;
  }
  setAssemblyInfo(undefined);
  fetch(`/api/assembly/product/${product.rowIndex}`)
    .then((r) => r.json())
    .then((data) => setAssemblyInfo(data ?? null))
    .catch(() => setAssemblyInfo(null));
}, [product?.rowIndex]);

const moveToStage = async (targetStage: AssemblyStage) => {
  if (!draftProduct) return;
  setMovingStage(true);
  try {
    const res = await fetch('/api/assembly/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rowIndexes: [draftProduct.rowIndex],
        targetStage,
        batchStrategy: { type: 'new' },
      }),
    });
    if (res.ok) {
      toast.success(`Moved to "${targetStage}"`);
      setAssemblyInfo({ stage: targetStage, batchId: '', batchName: '' });
    } else {
      toast.error('Move failed');
    }
  } finally {
    setMovingStage(false);
  }
};

const handleMoveToNext = () => {
  const currentStage = assemblyInfo?.stage;
  const currentIndex = currentStage ? ASSEMBLY_STAGES.indexOf(currentStage) : -1;
  const nextStage: AssemblyStage =
    currentIndex === -1 || currentIndex >= ASSEMBLY_STAGES.length - 1
      ? ASSEMBLY_STAGES[0]
      : ASSEMBLY_STAGES[currentIndex + 1];
  moveToStage(nextStage);
};
```

Also add the sonner import at the top of the file:
```ts
import { toast } from 'sonner';
```

- [ ] **Step 3: Add the split button to the sheet header**

In the JSX, locate the `<div className="flex items-start justify-between gap-4">` block. After the title/description `<div className="min-w-0 flex-1">` block closes, but BEFORE the closing `</div>` of the flex container, add the split button:

The header area currently ends with:
```tsx
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
```

Insert the split-button and stage label between those two divs:

```tsx
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex">
              <Button
                size="sm"
                variant="outline"
                className="rounded-r-none border-r-0"
                disabled={movingStage}
                onClick={handleMoveToNext}
              >
                <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                {assemblyInfo?.stage
                  ? `Move to ${ASSEMBLY_STAGES[ASSEMBLY_STAGES.indexOf(assemblyInfo.stage) + 1] ?? 'next'}`
                  : 'Add to Assembly'}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-l-none px-2"
                    disabled={movingStage}
                    aria-label="Select stage"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {ASSEMBLY_STAGES.map((stage) => (
                    <DropdownMenuItem key={stage} onClick={() => moveToStage(stage)}>
                      {stage}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {assemblyInfo?.stage && (
              <span className="text-xs text-[hsl(var(--text-tertiary))]">
                Currently in: {assemblyInfo.stage}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
```

(Remove the original closing `</div>` before `<div className="flex flex-wrap…">` since we're replacing it with the block above.)

- [ ] **Step 4: Verify TypeScript**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Manual verification** — open a product detail sheet. The header should show a split button before the close button. The left side should say "Add to Assembly" for untracked products, and show the next stage name for tracked ones. Clicking should toast a success and update the label.

- [ ] **Step 6: Commit**

```bash
cd e:/projects/sheet-admin && git add components/products/product-detail-sheet.tsx && git commit -m "feat: add split-button move control to product detail sheet"
```

---

## Task 15: Final verification

- [ ] **Step 1: TypeScript clean build**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit 2>&1
```

Expected: no errors (or only pre-existing errors).

- [ ] **Step 2: Dev server starts**

```bash
cd e:/projects/sheet-admin && npm run dev
```

Expected: compiles without errors.

- [ ] **Step 3: End-to-end smoke test**

1. Navigate to `/products` — table loads, no console errors.
2. Click 3-dots on a row → "Move to Next Stage" is visible.
3. Click it → toast "Moved to 'In Review'" appears.
4. Navigate to `/assembly` via sidebar → "Assembly Line" link visible.
5. Assembly page shows 6 stage sections. "In Review" shows a batch with the product.
6. Open the product's detail sheet → split button shows "Move to 2nd Review" and "Currently in: In Review".
7. Click the chevron dropdown → all 6 stages listed. Select "Selling Price" → toast confirms.
8. Back on assembly page, product appears in "Selling Price".
9. Select multiple rows → bulk toolbar shows "Move to Stage…" dropdown.
10. Select a stage → dialog opens with "New batch" / "Add to existing" options.
11. Confirm → products appear in assembly, toast shown.
12. Move a product to "Ready for Upload" → verify `readyForUpload` is set to TRUE in the sheet (check Google Sheets directly).

- [ ] **Step 4: Final commit**

```bash
cd e:/projects/sheet-admin && git add -A && git status
# verify nothing unexpected, then:
git commit -m "feat: complete assembly line feature" --allow-empty
```
