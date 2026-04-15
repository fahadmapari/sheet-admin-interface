# Sheet Header Drift Detection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically detect when Google Sheet column headers change, show a persistent amber warning banner to admins, and let an admin confirm they've verified the mapping — saving the new headers as the updated baseline.

**Architecture:** The check runs as a side-effect inside `GET /api/products` with a 1-hour cooldown stored in MongoDB. A new `GET /api/header-check` endpoint reads the stored drift status (MongoDB-only, no sheet API). A client banner component uses SWR to fetch that status on mount and shows a dismissable alert; the Settings > Column Mapping tab shows per-column detail and the acknowledge action.

**Tech Stack:** Next.js 16, MongoDB (native driver), `googleapis`, SWR, shadcn/ui, Tailwind CSS, `lucide-react`, `sonner` (toasts)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `lib/header-check.ts` | Core types, diff logic, `runHeaderCheckIfDue`, `getHeaderCheckStatus`, `acknowledgeHeaderDrift` |
| Create | `app/api/header-check/route.ts` | `GET /api/header-check` — returns drift status (admin-only meaningful response) |
| Create | `app/api/header-check/acknowledge/route.ts` | `POST /api/header-check/acknowledge` — admin-only acknowledge action |
| Modify | `app/api/products/route.ts` | Fire-and-forget `runHeaderCheckIfDue` in `GET` handler |
| Create | `components/layout/header-drift-banner.tsx` | Amber banner client component, SWR-driven |
| Modify | `app/(app)/layout.tsx` | Include `<HeaderDriftBanner />` |
| Modify | `app/(app)/settings/page.tsx` | Read `searchParams.tab` so `/settings?tab=column-mapping` navigates directly |
| Modify | `components/settings/column-mapping-settings.tsx` | Add drift alert with per-column table + acknowledge button |

---

## Task 1: `lib/header-check.ts` — core types and logic

**Files:**
- Create: `lib/header-check.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/header-check.ts
import 'server-only';
import { getDb } from './mongodb';
import { fetchRow, type SheetsAuthContext } from './sheets';
import { colIndexToLetter } from './column-utils';

const COLLECTION = 'headercheck';
const SINGLETON_ID = 'singleton';
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export interface HeaderDriftColumn {
  colIndex: number;
  colLetter: string;
  baselineValue: string;
  actualValue: string;
}

export interface HeaderCheckStatus {
  status: 'ok' | 'drift';
  driftDetails: {
    changedColumns: HeaderDriftColumn[];
    detectedAt: string; // ISO string for JSON serialisation
  } | null;
}

// Internal document shape — use `as any` on the collection (same pattern as access-control.ts)
// to avoid MongoDB driver _id type friction when querying by a string singleton ID.
interface HeaderCheckDoc {
  baseline: string[];
  lastChecked: Date;
  status: 'ok' | 'drift';
  driftDetails: {
    changedColumns: HeaderDriftColumn[];
    detectedAt: Date;
  } | null;
}

/** Compare two header arrays and return a description of every difference. */
function diffHeaders(baseline: string[], actual: string[]): HeaderDriftColumn[] {
  const maxLen = Math.max(baseline.length, actual.length);
  const changes: HeaderDriftColumn[] = [];
  for (let i = 0; i < maxLen; i++) {
    const baseVal = baseline[i] ?? '';
    const actualVal = actual[i] ?? '';
    if (baseVal !== actualVal) {
      changes.push({
        colIndex: i,
        colLetter: colIndexToLetter(i),
        baselineValue: baseVal,
        actualValue: actualVal,
      });
    }
  }
  return changes;
}

/**
 * Fast MongoDB-only read — no Sheets API call.
 * Returns { status: 'ok', driftDetails: null } when no document exists yet
 * (first run hasn't happened).
 */
export async function getHeaderCheckStatus(): Promise<HeaderCheckStatus> {
  try {
    const db = await getDb();
    const doc = await (db.collection(COLLECTION) as any).findOne({ _id: SINGLETON_ID }) as (HeaderCheckDoc & { _id: string }) | null;
    if (!doc) return { status: 'ok', driftDetails: null };
    return {
      status: doc.status,
      driftDetails: doc.driftDetails
        ? {
            changedColumns: doc.driftDetails.changedColumns,
            detectedAt: doc.driftDetails.detectedAt.toISOString(),
          }
        : null,
    };
  } catch (err) {
    console.error('[header-check] Failed to get status:', err);
    return { status: 'ok', driftDetails: null };
  }
}

/**
 * Called as a fire-and-forget side-effect inside GET /api/products.
 * - First call (no document): saves current headers as baseline, status 'ok'.
 * - Subsequent calls within 1 hour: no-op.
 * - Subsequent calls after 1 hour: fetches row 1, compares to baseline, writes result.
 * Never throws — errors are logged and swallowed so products load is unaffected.
 */
export async function runHeaderCheckIfDue(context: SheetsAuthContext): Promise<void> {
  try {
    const db = await getDb();
    const col = db.collection(COLLECTION) as any;
    const doc = await col.findOne({ _id: SINGLETON_ID }) as (HeaderCheckDoc & { _id: string }) | null;

    // First run: save baseline, no warning
    if (!doc) {
      const actual = await fetchRow(context, 1);
      await col.insertOne({
        _id: SINGLETON_ID,
        baseline: actual,
        lastChecked: new Date(),
        status: 'ok',
        driftDetails: null,
      });
      return;
    }

    // Skip if checked recently
    if (Date.now() - doc.lastChecked.getTime() < CHECK_INTERVAL_MS) return;

    const actual = await fetchRow(context, 1);
    const changedColumns = diffHeaders(doc.baseline, actual);

    if (changedColumns.length === 0) {
      await col.updateOne(
        { _id: SINGLETON_ID },
        { $set: { lastChecked: new Date(), status: 'ok', driftDetails: null } },
      );
    } else {
      await col.updateOne(
        { _id: SINGLETON_ID },
        {
          $set: {
            lastChecked: new Date(),
            status: 'drift',
            driftDetails: { changedColumns, detectedAt: new Date() },
          },
        },
      );
    }
  } catch (err) {
    console.error('[header-check] Check failed (non-fatal):', err);
  }
}

/**
 * Called when an admin clicks "Confirm headers verified".
 * Fetches the current sheet headers via service account and saves them as the
 * new baseline, clearing any drift warning.
 */
export async function acknowledgeHeaderDrift(adminEmail: string): Promise<void> {
  const serviceAuth: SheetsAuthContext = { auth: 'service' };
  const actual = await fetchRow(serviceAuth, 1);
  const db = await getDb();
  await (db.collection(COLLECTION) as any).replaceOne(
    { _id: SINGLETON_ID },
    {
      _id: SINGLETON_ID,
      baseline: actual,
      lastChecked: new Date(),
      status: 'ok',
      driftDetails: null,
    },
    { upsert: true },
  );
  console.log(`[header-check] Drift acknowledged by ${adminEmail}`);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -40
```

Expected: no errors in `lib/header-check.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/header-check.ts
git commit -m "feat: add header-check lib with drift detection logic"
```

---

## Task 2: `GET /api/header-check` route

**Files:**
- Create: `app/api/header-check/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/header-check/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { getHeaderCheckStatus } from '@/lib/header-check';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Non-admins receive a no-op response so the banner doesn't render for them
  const admin = await isAdmin(session.user.email);
  if (!admin) {
    return NextResponse.json({ status: 'ok', driftDetails: null });
  }
  const status = await getHeaderCheckStatus();
  return NextResponse.json(status);
}
```

- [ ] **Step 2: Manually verify**

Start the dev server (`npm run dev`). Sign in as an admin and run in the browser console:

```javascript
fetch('/api/header-check').then(r => r.json()).then(console.log)
```

Expected: `{ status: "ok", driftDetails: null }` (first run with no MongoDB doc yet — or actual status if products page was loaded).

- [ ] **Step 3: Commit**

```bash
git add app/api/header-check/route.ts
git commit -m "feat: add GET /api/header-check status endpoint"
```

---

## Task 3: `POST /api/header-check/acknowledge` route

**Files:**
- Create: `app/api/header-check/acknowledge/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/header-check/acknowledge/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { acknowledgeHeaderDrift } from '@/lib/header-check';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await acknowledgeHeaderDrift(session.user.email);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Manually verify**

In the browser console (signed in as admin):

```javascript
fetch('/api/header-check/acknowledge', { method: 'POST' }).then(r => r.json()).then(console.log)
```

Expected: `{ ok: true }`. Check MongoDB `headercheck` collection — should have `status: "ok"` and a fresh `lastChecked`.

- [ ] **Step 3: Commit**

```bash
git add app/api/header-check/acknowledge/route.ts
git commit -m "feat: add POST /api/header-check/acknowledge endpoint"
```

---

## Task 4: Wire side-effect into `GET /api/products`

**Files:**
- Modify: `app/api/products/route.ts`

- [ ] **Step 1: Add the import and fire-and-forget call**

In `app/api/products/route.ts`, add the import at the top:

```typescript
import { runHeaderCheckIfDue } from '@/lib/header-check';
```

Then inside the `GET` handler, after `const sheetsAuth = { auth: 'user' as const, accessToken };`, add:

```typescript
// Fire-and-forget: does not block or affect the products response
runHeaderCheckIfDue(sheetsAuth).catch(() => {});
```

The full updated `GET` handler:

```typescript
export async function GET() {
  try {
    const accessToken = await requireGoogleAccessToken();
    const sheetsAuth = { auth: 'user' as const, accessToken };

    // Fire-and-forget: does not block or affect the products response
    runHeaderCheckIfDue(sheetsAuth).catch(() => {});

    const [colMap, rows] = await Promise.all([
      getEffectiveColumnMap(),
      fetchAllRows(sheetsAuth),
    ]);

    const linkColIndex = colMap['link'];
    const imageLinksColIndex = colMap['imageLinks'];

    const [linkHyperlinks, imageLinksRichText] = await Promise.all([
      fetchColumnHyperlinks(sheetsAuth, linkColIndex),
      fetchColumnRichTextLinks(sheetsAuth, imageLinksColIndex),
    ]);

    const products: TourProduct[] = rows
      .slice(1)
      .map((row, i) => {
        const rowIndex = i + 2;
        return rowToProduct(
          row,
          rowIndex,
          linkHyperlinks.get(rowIndex),
          imageLinksRichText.get(rowIndex),
          colMap,
        );
      });

    return NextResponse.json(products);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err instanceof GoogleAccessTokenError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 2: Verify products still load**

```bash
npm run dev
```

Load the products page. Confirm products load normally. Check browser Network tab — `GET /api/products` should return `200` with the product array as before.

- [ ] **Step 3: Verify header check runs**

After loading products, check MongoDB `headercheck` collection. A document with `_id: "singleton"` should exist with `status: "ok"` and the current sheet row 1 values as `baseline`.

- [ ] **Step 4: Commit**

```bash
git add app/api/products/route.ts
git commit -m "feat: trigger header drift check as side-effect of products load"
```

---

## Task 5: `HeaderDriftBanner` component + layout integration

**Files:**
- Create: `components/layout/header-drift-banner.tsx`
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Create the banner component**

```typescript
// components/layout/header-drift-banner.tsx
'use client';

import useSWR from 'swr';
import { AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/fetcher';
import type { HeaderCheckStatus } from '@/lib/header-check';

export function HeaderDriftBanner() {
  const { data } = useSWR<HeaderCheckStatus>('/api/header-check', fetcher, {
    revalidateOnFocus: false,
  });

  const router = useRouter();

  if (!data || data.status !== 'drift') return null;

  return (
    <div className="flex items-center justify-between gap-4 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          Sheet column headers have changed since your last verification. Please review the column mapping to ensure nothing is misaligned.
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-500/50 dark:text-amber-300 dark:hover:bg-amber-500/20"
        onClick={() => router.push('/settings?tab=column-mapping')}
      >
        Review Column Mapping →
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Add the banner to the app layout**

Replace the content of `app/(app)/layout.tsx` with:

```typescript
// app/(app)/layout.tsx
import type { ReactNode } from 'react';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { HeaderDriftBanner } from '@/components/layout/header-drift-banner';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header />
        <HeaderDriftBanner />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="mx-auto flex h-full min-h-0 w-full max-w-screen-xl flex-1 flex-col overflow-y-auto px-3 py-4 md:px-6 md:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Manually simulate drift and verify the banner**

In MongoDB, directly update the `headercheck` document to force a drift state:

```javascript
// Run in MongoDB shell / Compass
db.headercheck.updateOne(
  { _id: "singleton" },
  {
    $set: {
      status: "drift",
      driftDetails: {
        changedColumns: [
          { colIndex: 5, colLetter: "F", baselineValue: "Product Link", actualValue: "Product URL" }
        ],
        detectedAt: new Date()
      }
    }
  }
)
```

Reload the app as an admin. The amber banner should appear below the header. Sign in as a non-admin — banner should not appear.

- [ ] **Step 4: Commit**

```bash
git add components/layout/header-drift-banner.tsx app/(app)/layout.tsx
git commit -m "feat: add header drift banner to app layout"
```

---

## Task 6: Settings page — deep-link tab support

**Files:**
- Modify: `app/(app)/settings/page.tsx`

- [ ] **Step 1: Read `searchParams.tab` to support direct navigation**

Replace `app/(app)/settings/page.tsx` with:

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAccessControl } from '@/lib/access-control';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StageSubscriptionSettings } from '@/components/notifications/stage-subscription-settings';
import { AccessControlSettings } from '@/components/settings/access-control-settings';
import { ColumnGroupSettings } from '@/components/settings/column-group-settings';
import { ColumnMappingSettings } from '@/components/settings/column-mapping-settings';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const session = await getServerSession(authOptions);
  const accessControl = await getAccessControl();
  const showAccessTab =
    !!session?.user?.email && accessControl.adminEmails.includes(session.user.email.toLowerCase());

  const validAdminTabs = ['access', 'column-groups', 'column-mapping'];
  const defaultTab =
    tab && (tab === 'notifications' || (showAccessTab && validAdminTabs.includes(tab)))
      ? tab
      : 'notifications';

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Tabs defaultValue={defaultTab}>
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            {showAccessTab && <TabsTrigger value="access">Access</TabsTrigger>}
            {showAccessTab && <TabsTrigger value="column-groups">Column Groups</TabsTrigger>}
            {showAccessTab && <TabsTrigger value="column-mapping">Column Mapping</TabsTrigger>}
          </TabsList>
        </div>
        <TabsContent value="notifications" className="mt-4">
          <StageSubscriptionSettings />
        </TabsContent>
        {showAccessTab && (
          <TabsContent value="access" className="mt-4">
            <AccessControlSettings
              initialData={accessControl}
              currentUserEmail={session!.user!.email!}
            />
          </TabsContent>
        )}
        {showAccessTab && (
          <TabsContent value="column-groups" className="mt-4">
            <ColumnGroupSettings />
          </TabsContent>
        )}
        {showAccessTab && (
          <TabsContent value="column-mapping" className="mt-4">
            <ColumnMappingSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: Verify deep-link works**

Navigate directly to `http://localhost:3000/settings?tab=column-mapping` as an admin. The Column Mapping tab should be active on load instead of Notifications.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/settings/page.tsx"
git commit -m "feat: support ?tab= deep-link in settings page"
```

---

## Task 7: `ColumnMappingSettings` — drift alert + acknowledge button

**Files:**
- Modify: `components/settings/column-mapping-settings.tsx`

- [ ] **Step 1: Add imports**

At the top of `components/settings/column-mapping-settings.tsx`, add these imports after the existing ones:

```typescript
import useSWR from 'swr';
import { AlertTriangle } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import type { HeaderCheckStatus } from '@/lib/header-check';
```

- [ ] **Step 2: Add SWR hook and acknowledge handler inside `ColumnMappingSettings`**

Inside the `ColumnMappingSettings` function body, after the existing state declarations, add:

```typescript
const { data: headerCheck, mutate: mutateHeaderCheck } = useSWR<HeaderCheckStatus>(
  '/api/header-check',
  fetcher,
  { revalidateOnFocus: false },
);
const [isAcknowledging, setIsAcknowledging] = useState(false);

async function handleAcknowledge() {
  setIsAcknowledging(true);
  try {
    const res = await fetch('/api/header-check/acknowledge', { method: 'POST' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Failed to acknowledge');
    }
    await mutateHeaderCheck();
    toast.success('Column headers verified');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to confirm verification');
  } finally {
    setIsAcknowledging(false);
  }
}
```

- [ ] **Step 3: Add the drift alert block in the JSX**

In the returned JSX of `ColumnMappingSettings`, insert the drift alert block at the very top of the `<div className="flex flex-col gap-4">`, before the existing `{/* Toolbar */}` comment:

```tsx
{headerCheck?.status === 'drift' && headerCheck.driftDetails && (
  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
    <div className="flex items-start gap-2">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="flex flex-1 flex-col gap-3">
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Sheet headers have changed
          </p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
            The following columns differ from the last verified baseline:
          </p>
        </div>
        <div className="overflow-hidden rounded border border-amber-200 bg-white text-xs dark:border-amber-500/30 dark:bg-black/20">
          <table className="w-full">
            <thead>
              <tr className="border-b border-amber-200 dark:border-amber-500/30">
                <th className="px-3 py-1.5 text-left font-medium text-amber-700 dark:text-amber-400">
                  Column
                </th>
                <th className="px-3 py-1.5 text-left font-medium text-amber-700 dark:text-amber-400">
                  Was
                </th>
                <th className="px-3 py-1.5 text-left font-medium text-amber-700 dark:text-amber-400">
                  Now
                </th>
              </tr>
            </thead>
            <tbody>
              {headerCheck.driftDetails.changedColumns.map((col) => (
                <tr
                  key={col.colIndex}
                  className="border-b border-amber-100 last:border-0 dark:border-amber-500/20"
                >
                  <td className="px-3 py-1.5 font-mono text-amber-800 dark:text-amber-300">
                    {col.colLetter}
                  </td>
                  <td className="px-3 py-1.5 text-amber-700 dark:text-amber-400">
                    {col.baselineValue || '(empty)'}
                  </td>
                  <td className="px-3 py-1.5 text-amber-700 dark:text-amber-400">
                    {col.actualValue || '(empty)'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Review the mapping table below and adjust any affected fields, then confirm.
        </p>
        <Button
          size="sm"
          onClick={handleAcknowledge}
          disabled={isAcknowledging}
          className="self-start bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700"
        >
          {isAcknowledging ? 'Confirming…' : 'Confirm headers verified'}
        </Button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: Verify end-to-end**

With the drift state still forced in MongoDB (from Task 5 Step 3):

1. Navigate to `/settings?tab=column-mapping` as admin
2. Confirm the amber alert block appears above the mapping table showing column F: "Product Link" → "Product URL"
3. Click "Confirm headers verified"
4. Confirm toast shows "Column headers verified"
5. Confirm the amber alert disappears
6. Check MongoDB `headercheck` — `status` should be `"ok"`, `baseline` should reflect current sheet headers
7. Reload the page — confirm the alert does not reappear
8. Reload products page — confirm the banner in the layout is also gone

- [ ] **Step 5: Commit**

```bash
git add components/settings/column-mapping-settings.tsx
git commit -m "feat: add header drift alert and acknowledge button to column mapping settings"
```

---

## Verification Checklist

End-to-end smoke test after all tasks are complete:

1. **Fresh state**: Drop the `headercheck` MongoDB collection. Load the products page. Confirm products load normally and no banner appears.
2. **Baseline saved**: Check MongoDB — `headercheck` document exists with `status: "ok"` and the current sheet row 1.
3. **No spurious drift**: Reload products page multiple times within an hour. No banner appears, `lastChecked` does not update (cooldown is active).
4. **Simulated drift**: Rename a header in the Google Sheet (e.g., column F). Wait for or force the cooldown to expire (set `lastChecked` back 2 hours in MongoDB). Reload products page.
5. **Banner appears**: Refresh the page. The amber banner appears in the layout. Clicking "Review Column Mapping →" navigates to `/settings?tab=column-mapping`.
6. **Drift detail**: The column mapping settings tab shows the amber alert with the specific column(s) that changed.
7. **Acknowledge flow**: Click "Confirm headers verified". Toast appears. Alert disappears. Banner disappears on next page load.
8. **Non-admin isolation**: Sign in as a non-admin. No banner appears anywhere.
