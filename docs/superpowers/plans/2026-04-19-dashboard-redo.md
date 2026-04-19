# Dashboard Redo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the dashboard to cover both Products and Written Products on one unified page, separated by section headings, while removing PIC Workload and OTA Coverage charts.

**Architecture:** The server page (`app/(app)/page.tsx`) fetches both datasets in parallel and passes them to `DashboardClient`. The client renders two sections divided by a heading separator. Written Products charts live in a new `written-products-charts.tsx` file reusing the progress-bar pattern from `UploadProgress`.

**Tech Stack:** Next.js 16 (server components + client components), React, Recharts, shadcn/ui, SWR-free (server-side fetch for dashboard).

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `app/(app)/page.tsx` | Fetch both datasets in parallel, pass to client |
| Modify | `components/dashboard/dashboard-client.tsx` | Accept `writtenProducts` prop, render two sections |
| Modify | `components/dashboard/charts.tsx` | Remove `PicWorkload` and `OtaCoverage` exports |
| Create | `components/dashboard/written-products-charts.tsx` | `WrittenContentCompletion` and `WrittenChannelCoverage` components |

No tests exist in this project (no test runner configured). Verification is by running `npm run build` and visual inspection of the dev server.

---

## Task 1: Remove PicWorkload and OtaCoverage from charts.tsx

**Files:**
- Modify: `components/dashboard/charts.tsx`

- [ ] **Step 1: Open `components/dashboard/charts.tsx` and delete the `PicWorkload` function**

Remove everything from the `// ─── Chart 5: PIC Workload` comment through the closing `}` of that function (lines ~222–259).

- [ ] **Step 2: Delete the `OtaCoverage` function and its supporting constants**

Remove the `OTA_CHANNELS` constant, the `isOtaActive` helper, and the `OtaCoverage` function (lines ~261–316).

The file should now export only: `ProductsByCountry`, `ProductsByType`, `ProductsByStatus`, `UploadProgress`.

- [ ] **Step 3: Verify build has no type errors**

```bash
npm run build 2>&1 | head -40
```

Expected: build completes (may show unused-import warnings from `dashboard-client.tsx` — those are fixed in Task 2).

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/charts.tsx
git commit -m "feat: remove PicWorkload and OtaCoverage charts from dashboard"
```

---

## Task 2: Update DashboardClient to remove deleted chart references and accept writtenProducts prop

**Files:**
- Modify: `components/dashboard/dashboard-client.tsx`

- [ ] **Step 1: Update imports in `dashboard-client.tsx`**

Replace the existing imports block at the top of the file with:

```tsx
'use client';

import {
  AlertTriangle,
  CheckCircle2,
  CircleGauge,
  Clock3,
  FileText,
  Package,
  Upload,
  Waypoints,
} from 'lucide-react';
import type { TourProduct } from '@/lib/types';
import type { WrittenProduct } from '@/lib/types';
import { KpiCard } from './kpi-card';
import {
  ProductsByCountry,
  ProductsByType,
  ProductsByStatus,
  UploadProgress,
} from './charts';
import {
  WrittenContentCompletion,
  WrittenChannelCoverage,
} from './written-products-charts';
```

- [ ] **Step 2: Update the component props interface**

Replace:
```tsx
interface DashboardClientProps {
  products: TourProduct[];
}
```
With:
```tsx
interface DashboardClientProps {
  products: TourProduct[];
  writtenProducts: WrittenProduct[];
}
```

- [ ] **Step 3: Update the function signature**

Replace:
```tsx
export function DashboardClient({ products }: DashboardClientProps) {
```
With:
```tsx
export function DashboardClient({ products, writtenProducts }: DashboardClientProps) {
```

- [ ] **Step 4: Add Written Products KPI computations after the existing product computations**

After the `const onHold = ...` line, add:

```tsx
  const wpTotal = writtenProducts.length;
  const wpContentExist = writtenProducts.filter((p) => p.contentExist).length;
  const wpB2b = writtenProducts.filter((p) => p.b2b).length;
  const wpB2c = writtenProducts.filter((p) => p.b2c).length;
```

- [ ] **Step 5: Replace the return JSX**

Replace the entire `return (...)` block with:

```tsx
  return (
    <div className="flex flex-col gap-8">
      {/* ── Products ─────────────────────────────────────────── */}
      <div>
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-sm font-medium text-[hsl(var(--text-secondary))] uppercase tracking-wider">
            Products
          </h2>
          <div className="flex-1 border-t border-[hsl(var(--border))]" />
          <span className="text-sm text-[hsl(var(--text-tertiary))]">
            {total.toLocaleString()} total
          </span>
        </div>

        <section>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
            <KpiCard title="Total Products" value={total} icon={<Package className="h-4 w-4" />} />
            <KpiCard
              title="Ready for Upload"
              value={readyForUpload}
              total={total}
              tone="success"
              icon={<Upload className="h-4 w-4" />}
            />
            <KpiCard
              title="Uploaded"
              value={uploaded}
              total={total}
              tone="info"
              icon={<Waypoints className="h-4 w-4" />}
            />
            <KpiCard
              title="In Progress"
              value={inProgress}
              total={total}
              tone="warning"
              icon={<Clock3 className="h-4 w-4" />}
            />
            <KpiCard
              title="High Priority"
              value={highPriority}
              total={total}
              tone="error"
              icon={<AlertTriangle className="h-4 w-4" />}
            />
            <KpiCard
              title="Completed"
              value={completed}
              total={total}
              tone="success"
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <KpiCard
              title="On Hold"
              value={onHold}
              total={total}
              icon={<CircleGauge className="h-4 w-4" />}
            />
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <ProductsByCountry products={products} />
          <ProductsByType products={products} />
          <ProductsByStatus products={products} />
          <UploadProgress products={products} />
        </section>
      </div>

      {/* ── Written Products ──────────────────────────────────── */}
      <div>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-sm font-medium text-[hsl(var(--text-secondary))] uppercase tracking-wider">
            Written Products
          </h2>
          <div className="flex-1 border-t border-[hsl(var(--border))]" />
          <span className="text-sm text-[hsl(var(--text-tertiary))]">
            {wpTotal.toLocaleString()} total
          </span>
        </div>

        <section>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Total Written"
              value={wpTotal}
              icon={<FileText className="h-4 w-4" />}
            />
            <KpiCard
              title="Content Exists"
              value={wpContentExist}
              total={wpTotal}
              tone="success"
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <KpiCard
              title="B2B"
              value={wpB2b}
              total={wpTotal}
              tone="info"
              icon={<Waypoints className="h-4 w-4" />}
            />
            <KpiCard
              title="B2C"
              value={wpB2c}
              total={wpTotal}
              tone="info"
              icon={<Waypoints className="h-4 w-4" />}
            />
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <WrittenContentCompletion writtenProducts={writtenProducts} />
          <WrittenChannelCoverage writtenProducts={writtenProducts} />
        </section>
      </div>
    </div>
  );
```

- [ ] **Step 6: Verify TypeScript (build will fail until Task 3 creates the new charts file — that's expected)**

```bash
npm run lint 2>&1 | head -30
```

Expected: errors only about missing `./written-products-charts` module — these are fixed in Task 3.

- [ ] **Step 7: Commit**

```bash
git add components/dashboard/dashboard-client.tsx
git commit -m "feat: update DashboardClient with two-section layout and written products KPIs"
```

---

## Task 3: Create written-products-charts.tsx

**Files:**
- Create: `components/dashboard/written-products-charts.tsx`

- [ ] **Step 1: Create the file with both chart components**

Create `components/dashboard/written-products-charts.tsx` with the following content:

```tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { WrittenProduct } from '@/lib/types';

interface WrittenProductsChartsProps {
  writtenProducts: WrittenProduct[];
}

const CONTENT_FLAGS: { key: keyof WrittenProduct; label: string }[] = [
  { key: 'ccOk', label: 'CC OK' },
  { key: 'isOk', label: 'IS OK' },
  { key: 'rrOk', label: 'RR OK' },
  { key: 'ssOk', label: 'SS OK' },
  { key: 'contentExist', label: 'Content Exists' },
  { key: 'ssNotes', label: 'SS Notes' },
];

const CHANNEL_FLAGS: { key: keyof WrittenProduct; label: string }[] = [
  { key: 'b2b', label: 'B2B' },
  { key: 'b2c', label: 'B2C' },
];

function FlagProgressBar({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-[hsl(var(--text-secondary))]">{label}</span>
        <span className="font-medium text-[hsl(var(--text-primary))]">
          {count.toLocaleString()} / {total.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--surface-raised))]">
        <div
          className="h-full rounded-full bg-[hsl(var(--accent))] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function WrittenContentCompletion({ writtenProducts }: WrittenProductsChartsProps) {
  const total = writtenProducts.length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Completion</CardTitle>
        <CardDescription>Approval flag coverage across written products</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {CONTENT_FLAGS.map(({ key, label }) => (
          <FlagProgressBar
            key={key}
            label={label}
            count={writtenProducts.filter((p) => p[key] === true).length}
            total={total}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export function WrittenChannelCoverage({ writtenProducts }: WrittenProductsChartsProps) {
  const total = writtenProducts.length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel Coverage</CardTitle>
        <CardDescription>B2B and B2C availability across written products</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {CHANNEL_FLAGS.map(({ key, label }) => (
          <FlagProgressBar
            key={key}
            label={label}
            count={writtenProducts.filter((p) => p[key] === true).length}
            total={total}
          />
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Run build to verify no type errors**

```bash
npm run build 2>&1 | head -50
```

Expected: build completes successfully. The only remaining gap is the page not passing `writtenProducts` yet — fixed in Task 4.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/written-products-charts.tsx
git commit -m "feat: add WrittenContentCompletion and WrittenChannelCoverage chart components"
```

---

## Task 4: Update the dashboard page to fetch written products

**Files:**
- Modify: `app/(app)/page.tsx`

- [ ] **Step 1: Replace the full contents of `app/(app)/page.tsx`**

```tsx
export const dynamic = 'force-dynamic';

import { fetchAllRows } from '@/lib/sheets';
import { requireGoogleAccessToken } from '@/lib/google-session';
import { rowToProduct } from '@/lib/utils';
import { fetchAllWrittenProductRows } from '@/lib/written-products-sheets';
import { rowToWrittenProduct } from '@/lib/written-products-utils';
import { getEffectiveWrittenColumnMap } from '@/lib/written-column-mapping';
import { DashboardClient } from '@/components/dashboard/dashboard-client';

export default async function DashboardPage() {
  const accessToken = await requireGoogleAccessToken();

  const [rows, writtenRows, colMap] = await Promise.all([
    fetchAllRows({ auth: 'user', accessToken }),
    fetchAllWrittenProductRows(accessToken),
    getEffectiveWrittenColumnMap(),
  ]);

  const products = rows.slice(1).map((row, i) => rowToProduct(row, i + 2));
  const writtenProducts = writtenRows
    .slice(1)
    .map((row, i) => rowToWrittenProduct(row, i + 2, undefined, colMap));

  return <DashboardClient products={products} writtenProducts={writtenProducts} />;
}
```

Note: `textLinkUrl` is passed as `undefined` here because we don't need the hyperlink URL for dashboard metrics — only for the written products detail page.

- [ ] **Step 2: Run full build**

```bash
npm run build 2>&1 | head -60
```

Expected: build completes with no errors.

- [ ] **Step 3: Start dev server and visually verify**

```bash
npm run dev
```

Open `http://localhost:3000` and confirm:
- Products section heading with separator line and total count visible
- 7 KPI cards for Products
- 4 charts: Products by Country, Products by Type, Products by Status, Upload Progress (no PIC Workload, no OTA Coverage)
- Written Products section heading with separator line and total count visible
- 4 KPI cards for Written Products (Total Written, Content Exists, B2B, B2C)
- 2 cards: Content Completion (6 progress bars) and Channel Coverage (2 progress bars)

- [ ] **Step 4: Commit**

```bash
git add app/(app)/page.tsx
git commit -m "feat: fetch written products in dashboard page and pass to DashboardClient"
```
