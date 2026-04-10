# Column Group Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to rename, reorder, and reorganize the 11 hardcoded column groups that appear throughout the app (product detail tabs, views column picker, export dialog), with a reset-to-defaults option and an auto-generated "Others" group for ungrouped fields.

**Architecture:** Custom group config is stored in a MongoDB `columngroupconfig` singleton document. A `GET /api/column-groups` route returns the active config (custom or defaults) with an `isDefault` flag; `PUT` saves; `DELETE` resets. Client components replace their `import { COLUMN_GROUPS }` with a `useColumnGroups()` SWR hook that computes the "Others" group dynamically. A new admin-only "Column Groups" tab in Settings provides the editor UI.

**Tech Stack:** Next.js 14 App Router, MongoDB (via `lib/mongodb.ts`), SWR, shadcn/ui (Button, Input, Badge, DropdownMenu, Tabs), Lucide icons, TypeScript.

---

## File Map

**Create:**
- `lib/column-groups.ts` — server-only: type definitions, MongoDB read/write/delete helpers
- `app/api/column-groups/route.ts` — GET/PUT/DELETE API routes
- `lib/hooks/use-column-groups.ts` — SWR hook returning resolved groups + Others
- `components/settings/column-group-settings.tsx` — admin editor UI component

**Modify:**
- `app/(app)/settings/page.tsx` — add Column Groups tab (admin-only)
- `components/products/product-detail-tabs.tsx` — replace `COLUMN_GROUPS` import with `useColumnGroups()`
- `components/products/views-bar.tsx` — replace `COLUMN_GROUPS` import with `useColumnGroups()`
- `components/products/export-button.tsx` — thread groups into `getVisibleFields()`
- `components/products/product-table.tsx` — move `buildExtraColumns()` inside component using hook
- `app/(app)/products/products-client.tsx` — move `ALL_FIELD_IDS` inside component using hook

---

## Task 1: `lib/column-groups.ts` — server-side data layer

**Files:**
- Create: `lib/column-groups.ts`

- [ ] **Step 1: Create the file**

```ts
import 'server-only';
import { getDb } from './mongodb';
import { COLUMN_GROUPS } from './constants';

export interface ColumnGroup {
  id: string;
  label: string;
  fields: string[];
}

export interface ColumnGroupsResponse {
  groups: ColumnGroup[];
  isDefault: boolean;
}

const COLLECTION = 'columngroupconfig';
const SINGLETON_ID = 'singleton';

export async function getColumnGroups(): Promise<ColumnGroupsResponse> {
  const db = await getDb();
  const doc = await (db.collection(COLLECTION) as any).findOne({ _id: SINGLETON_ID }) as
    | { groups: ColumnGroup[] }
    | null;

  if (!doc) {
    return {
      groups: COLUMN_GROUPS.map((g) => ({
        id: g.id,
        label: g.label,
        fields: [...(g.fields as readonly string[])],
      })),
      isDefault: true,
    };
  }

  return { groups: doc.groups, isDefault: false };
}

export async function saveColumnGroups(groups: ColumnGroup[]): Promise<void> {
  const db = await getDb();
  await (db.collection(COLLECTION) as any).replaceOne(
    { _id: SINGLETON_ID },
    { _id: SINGLETON_ID, groups },
    { upsert: true }
  );
}

export async function resetColumnGroups(): Promise<void> {
  const db = await getDb();
  await (db.collection(COLLECTION) as any).deleteOne({ _id: SINGLETON_ID });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No errors from `lib/column-groups.ts`. (Other pre-existing errors are fine for now.)

- [ ] **Step 3: Commit**

```bash
git add lib/column-groups.ts
git commit -m "feat: add column-groups MongoDB data layer"
```

---

## Task 2: `app/api/column-groups/route.ts` — API routes

**Files:**
- Create: `app/api/column-groups/route.ts`

- [ ] **Step 1: Create the file**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { getColumnGroups, saveColumnGroups, resetColumnGroups, type ColumnGroup } from '@/lib/column-groups';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const data = await getColumnGroups();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(session.user.email))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json() as { groups: ColumnGroup[] };
    if (!Array.isArray(body?.groups)) {
      return NextResponse.json({ error: 'Invalid body: expected { groups: [...] }' }, { status: 400 });
    }

    await saveColumnGroups(body.groups);
    const data = await getColumnGroups();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(session.user.email))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await resetColumnGroups();
    const data = await getColumnGroups();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No errors from `app/api/column-groups/route.ts`.

- [ ] **Step 3: Smoke-test the GET route manually**

Start dev server: `npm run dev`
Open browser → sign in → visit `http://localhost:3000/api/column-groups`
Expected: JSON with `{ groups: [...11 groups...], isDefault: true }`

- [ ] **Step 4: Commit**

```bash
git add app/api/column-groups/route.ts
git commit -m "feat: add column-groups API (GET/PUT/DELETE)"
```

---

## Task 3: `lib/hooks/use-column-groups.ts` — SWR hook

**Files:**
- Create: `lib/hooks/use-column-groups.ts`

- [ ] **Step 1: Create the file**

```ts
import useSWR from 'swr';
import { COLUMN_GROUPS, FIELD_LABELS } from '@/lib/constants';
import type { ColumnGroupsResponse, ColumnGroup } from '@/lib/column-groups';

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(r.statusText);
    return r.json() as Promise<ColumnGroupsResponse>;
  });

// All field keys from the hardcoded defaults
const ALL_KNOWN_FIELDS = COLUMN_GROUPS.flatMap(
  (g) => g.fields as readonly string[]
);

function computeGroups(resolved: ColumnGroup[]): ColumnGroup[] {
  const assigned = new Set(resolved.flatMap((g) => g.fields));
  const unassigned = ALL_KNOWN_FIELDS.filter((f) => !assigned.has(f));

  if (unassigned.length === 0) return resolved;

  return [
    ...resolved,
    { id: 'others', label: 'Others', fields: unassigned },
  ];
}

const DEFAULT_GROUPS: ColumnGroup[] = COLUMN_GROUPS.map((g) => ({
  id: g.id,
  label: g.label,
  fields: [...(g.fields as readonly string[])],
}));

export interface UseColumnGroupsResult {
  groups: ColumnGroup[];
  isDefault: boolean;
  isLoading: boolean;
  mutate: () => void;
}

export function useColumnGroups(): UseColumnGroupsResult {
  const { data, isLoading, mutate } = useSWR<ColumnGroupsResponse>(
    '/api/column-groups',
    fetcher,
    { dedupingInterval: 30_000 }
  );

  const resolved = data?.groups ?? DEFAULT_GROUPS;
  const groups = computeGroups(resolved);

  return {
    groups,
    isDefault: data?.isDefault ?? true,
    isLoading,
    mutate,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No type errors in `lib/hooks/use-column-groups.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/use-column-groups.ts
git commit -m "feat: add useColumnGroups SWR hook with Others computation"
```

---

## Task 4: Update `product-detail-tabs.tsx`

**Files:**
- Modify: `components/products/product-detail-tabs.tsx`

The file currently imports `COLUMN_GROUPS` from `@/lib/constants` (line 15) and uses it directly in JSX (lines 547, 550, 558).

- [ ] **Step 1: Replace the import**

In the imports block, change:
```ts
import {
  BOOLEAN_FIELDS,
  COLUMN_GROUPS,
  FIELD_LABELS,
  PIC_VALUES,
  PRODUCT_STATUSES,
} from '@/lib/constants';
```
to:
```ts
import {
  BOOLEAN_FIELDS,
  FIELD_LABELS,
  PIC_VALUES,
  PRODUCT_STATUSES,
} from '@/lib/constants';
import { useColumnGroups } from '@/lib/hooks/use-column-groups';
```

- [ ] **Step 2: Call the hook inside the component**

Find the component function body (it starts with the form defined via `useForm`). Add the hook call near the top of the component, after the existing hooks:

```ts
const { groups: columnGroups } = useColumnGroups();
```

- [ ] **Step 3: Replace COLUMN_GROUPS references in JSX**

Replace all three occurrences of `COLUMN_GROUPS` in the JSX with `columnGroups`:

Line ~547: `<Tabs defaultValue={COLUMN_GROUPS[0].id}>` → `<Tabs defaultValue={columnGroups[0]?.id ?? ''}>`

Line ~550: `{COLUMN_GROUPS.map((group) => (` → `{columnGroups.map((group) => (`

Line ~558: `{COLUMN_GROUPS.map((group) => (` → `{columnGroups.map((group) => (`

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npm run build`
Expected: No errors in `product-detail-tabs.tsx`.

- [ ] **Step 5: Verify manually**

Start dev server. Open a product detail sheet. Confirm all tabs still appear and fields are displayed correctly.

- [ ] **Step 6: Commit**

```bash
git add components/products/product-detail-tabs.tsx
git commit -m "feat: product-detail-tabs uses useColumnGroups hook"
```

---

## Task 5: Update `views-bar.tsx`

**Files:**
- Modify: `components/products/views-bar.tsx`

The file imports `COLUMN_GROUPS` on line 11 and uses it inside `AddViewDialog` at line 189.

- [ ] **Step 1: Replace the import**

Change line 11:
```ts
import { COLUMN_GROUPS, FIELD_LABELS } from '@/lib/constants';
```
to:
```ts
import { FIELD_LABELS } from '@/lib/constants';
import { useColumnGroups } from '@/lib/hooks/use-column-groups';
```

- [ ] **Step 2: Call the hook inside AddViewDialog**

`AddViewDialog` is a component defined inside `views-bar.tsx`. Find its function body and add:

```ts
const { groups: columnGroups } = useColumnGroups();
```

- [ ] **Step 3: Replace the COLUMN_GROUPS reference**

Replace the reference at line ~189:
```ts
{COLUMN_GROUPS.map((group) => (
```
with:
```ts
{columnGroups.map((group) => (
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npm run build`
Expected: No errors in `views-bar.tsx`.

- [ ] **Step 5: Commit**

```bash
git add components/products/views-bar.tsx
git commit -m "feat: views-bar uses useColumnGroups hook"
```

---

## Task 6: Update `export-button.tsx`

**Files:**
- Modify: `components/products/export-button.tsx`

`COLUMN_GROUPS` is used in `getVisibleFields()` (line 31), a plain function called inside `ExportButton`. Make it accept `groups` as a parameter.

- [ ] **Step 1: Replace the import**

Change line 14:
```ts
import { COLUMN_GROUPS, FIELD_LABELS } from '@/lib/constants';
```
to:
```ts
import { FIELD_LABELS } from '@/lib/constants';
import { useColumnGroups } from '@/lib/hooks/use-column-groups';
import type { ColumnGroup } from '@/lib/column-groups';
```

- [ ] **Step 2: Thread `groups` into `getVisibleFields`**

Change the function signature and body:
```ts
function getVisibleFields(
  columnVisibility: VisibilityState,
  groups: ColumnGroup[]
): Array<keyof Omit<TourProduct, 'rowIndex'>> {
  const allFields = groups.flatMap(
    (g) => g.fields as unknown as Array<keyof Omit<TourProduct, 'rowIndex'>>
  );

  // Collect raw fields contributed by visible composite columns
  const fromComposite = new Set<string>();
  for (const [compositeId, fields] of Object.entries(COMPOSITE_TO_FIELDS)) {
    if (columnVisibility[compositeId] === true) {
      for (const f of fields) fromComposite.add(f);
    }
  }

  return allFields.filter((f) => columnVisibility[f] !== false || fromComposite.has(f));
}
```

- [ ] **Step 3: Call the hook and pass groups**

Inside `ExportButton`, add:
```ts
const { groups } = useColumnGroups();
```
Then change:
```ts
const visibleFields = getVisibleFields(columnVisibility);
```
to:
```ts
const visibleFields = getVisibleFields(columnVisibility, groups);
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npm run build`
Expected: No errors in `export-button.tsx`.

- [ ] **Step 5: Commit**

```bash
git add components/products/export-button.tsx
git commit -m "feat: export-button uses useColumnGroups hook"
```

---

## Task 7: Update `product-table.tsx`

**Files:**
- Modify: `components/products/product-table.tsx`

Currently, `buildExtraColumns()` is a free function called at module level to produce `EXTRA_COLUMNS`. Since it must use the hook's output, it needs to move inside the component as a `useMemo`.

- [ ] **Step 1: Replace the import**

Change line 22:
```ts
import { COLUMN_GROUPS, FIELD_LABELS } from '@/lib/constants';
```
to:
```ts
import { FIELD_LABELS } from '@/lib/constants';
import { useColumnGroups } from '@/lib/hooks/use-column-groups';
import type { ColumnGroup } from '@/lib/column-groups';
```

- [ ] **Step 2: Update `buildExtraColumns` to accept `groups` parameter and remove module-level call**

Change the function signature (line 39) from:
```ts
function buildExtraColumns(): ColumnDef<TourProduct>[] {
  return COLUMN_GROUPS.flatMap((group) =>
```
to:
```ts
function buildExtraColumns(groups: ColumnGroup[]): ColumnDef<TourProduct>[] {
  return groups.flatMap((group) =>
```

Delete the module-level constant (line 99):
```ts
const EXTRA_COLUMNS: ColumnDef<TourProduct>[] = buildExtraColumns();
```

- [ ] **Step 3: Call hook and move extra columns into component**

Inside `ProductTable` (starting line ~291), add the hook call after existing state declarations:
```ts
const { groups } = useColumnGroups();
const extraColumns = useMemo(() => buildExtraColumns(groups), [groups]);
```

- [ ] **Step 4: Update `buildColumns` call to use `extraColumns`**

Find the `buildColumns` function (line ~101) — it currently spreads `...EXTRA_COLUMNS`. Change it to accept `extraColumns` as a parameter:

```ts
function buildColumns(
  extraColumns: ColumnDef<TourProduct>[],
  onDeleteRequest: (product: TourProduct) => void,
  onEditRequest: (product: TourProduct) => void,
  onMoveToNextStage: (product: TourProduct) => void,
): ColumnDef<TourProduct>[] {
  return [
    // ... existing select, product, location, type, status, actions columns unchanged ...
    ...extraColumns,
    // ... rest of columns ...
  ];
}
```

Update the `useMemo` that calls `buildColumns` inside `ProductTable` (line ~306):
```ts
const columns = useMemo(
  () => buildColumns(extraColumns, onDeleteRequest, onEditRequest, onMoveToNextStage),
  [extraColumns, onDeleteRequest, onEditRequest, onMoveToNextStage],
);
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npm run build`
Expected: No errors in `product-table.tsx`.

- [ ] **Step 6: Commit**

```bash
git add components/products/product-table.tsx
git commit -m "feat: product-table uses useColumnGroups hook"
```

---

## Task 8: Update `products-client.tsx`

**Files:**
- Modify: `app/(app)/products/products-client.tsx`

Currently `ALL_FIELD_IDS` is a module-level constant (line 29) computed from `COLUMN_GROUPS`. It must move inside the component, derived from the hook.

- [ ] **Step 1: Replace the import**

Change line 13:
```ts
import { COLUMN_GROUPS } from '@/lib/constants';
```
to:
```ts
import { useColumnGroups } from '@/lib/hooks/use-column-groups';
```

- [ ] **Step 2: Remove module-level constant and move inside component**

Delete line 29:
```ts
const ALL_FIELD_IDS = COLUMN_GROUPS.flatMap((g) => g.fields as readonly string[]);
```

Inside `ProductsClient`, add the hook call near the top alongside other hooks, and derive `allFieldIds`:
```ts
const { groups: columnGroups } = useColumnGroups();
const allFieldIds = useMemo(
  () => columnGroups.flatMap((g) => g.fields),
  [columnGroups]
);
```

- [ ] **Step 3: Replace ALL_FIELD_IDS reference**

Find the `columnVisibility` useMemo (line ~137):
```ts
const base: VisibilityState = Object.fromEntries(ALL_FIELD_IDS.map((id) => [id, false]));
```
Replace with:
```ts
const base: VisibilityState = Object.fromEntries(allFieldIds.map((id) => [id, false]));
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npm run build`
Expected: No errors in `products-client.tsx`.

- [ ] **Step 5: Smoke-test**

Start dev server. Navigate to `/products`. Confirm the table loads, views work, and the product detail sheet tabs appear correctly.

- [ ] **Step 6: Commit**

```bash
git add app/(app)/products/products-client.tsx
git commit -m "feat: products-client uses useColumnGroups hook"
```

---

## Task 9: `components/settings/column-group-settings.tsx` — editor UI

**Files:**
- Create: `components/settings/column-group-settings.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useState, useRef } from 'react';
import { GripVertical, Plus, RotateCcw, Trash2, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FIELD_LABELS } from '@/lib/constants';
import { useColumnGroups } from '@/lib/hooks/use-column-groups';
import type { ColumnGroup } from '@/lib/column-groups';
import { toast } from 'sonner';

function generateId(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `group-${Date.now()}`;
}

export function ColumnGroupSettings() {
  const { groups: liveGroups, isDefault, isLoading, mutate } = useColumnGroups();

  // Exclude the synthetic Others group from editing state — it's never saved
  const editableGroups = liveGroups.filter((g) => g.id !== 'others');

  const [draft, setDraft] = useState<ColumnGroup[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState('');

  const groups = draft ?? editableGroups;
  const isDirty = draft !== null;

  function beginEdit(group: ColumnGroup) {
    setEditingLabelId(group.id);
    setLabelInput(group.label);
  }

  function commitLabel(groupId: string) {
    if (!labelInput.trim()) {
      setEditingLabelId(null);
      return;
    }
    setDraft((prev) =>
      (prev ?? editableGroups).map((g) =>
        g.id === groupId ? { ...g, label: labelInput.trim() } : g
      )
    );
    setEditingLabelId(null);
  }

  function addGroup() {
    const label = 'New Group';
    const id = generateId(label) + '-' + Date.now();
    const newGroup: ColumnGroup = { id, label, fields: [] };
    setDraft((prev) => [...(prev ?? editableGroups), newGroup]);
    // auto-focus for rename
    setTimeout(() => {
      setEditingLabelId(id);
      setLabelInput(label);
    }, 50);
  }

  function removeGroup(groupId: string) {
    setDraft((prev) => (prev ?? editableGroups).filter((g) => g.id !== groupId));
  }

  function removeField(groupId: string, field: string) {
    setDraft((prev) =>
      (prev ?? editableGroups).map((g) =>
        g.id === groupId ? { ...g, fields: g.fields.filter((f) => f !== field) } : g
      )
    );
  }

  function moveField(field: string, fromGroupId: string, toGroupId: string) {
    setDraft((prev) => {
      const base = prev ?? editableGroups;
      return base.map((g) => {
        if (g.id === fromGroupId) return { ...g, fields: g.fields.filter((f) => f !== field) };
        if (g.id === toGroupId) return { ...g, fields: [...g.fields, field] };
        return g;
      });
    });
  }

  function discard() {
    setDraft(null);
    setEditingLabelId(null);
  }

  async function save() {
    if (!draft) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/column-groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups: draft }),
      });
      if (!res.ok) throw new Error('Save failed');
      await mutate();
      setDraft(null);
      toast.success('Column groups saved');
    } catch {
      toast.error('Failed to save column groups');
    } finally {
      setIsSaving(false);
    }
  }

  async function resetToDefaults() {
    setIsSaving(true);
    try {
      const res = await fetch('/api/column-groups', { method: 'DELETE' });
      if (!res.ok) throw new Error('Reset failed');
      await mutate();
      setDraft(null);
      toast.success('Reset to defaults');
    } catch {
      toast.error('Failed to reset');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-[hsl(var(--text-secondary))]">Loading…</p>;
  }

  // Compute Others fields for display (unassigned in current draft/saved groups)
  const assignedFields = new Set(groups.flatMap((g) => g.fields));
  const othersFields = Object.keys(FIELD_LABELS).filter((f) => !assignedFields.has(f));

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          {isDirty && (
            <>
              <Button size="sm" onClick={save} disabled={isSaving}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={discard} disabled={isSaving}>
                Discard
              </Button>
            </>
          )}
        </div>
        {!isDefault && !isDirty && (
          <Button
            size="sm"
            variant="outline"
            onClick={resetToDefaults}
            disabled={isSaving}
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to defaults
          </Button>
        )}
      </div>

      {/* Group cards */}
      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <div
            key={group.id}
            className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              {editingLabelId === group.id ? (
                <Input
                  autoFocus
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  onBlur={() => commitLabel(group.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitLabel(group.id);
                    if (e.key === 'Escape') setEditingLabelId(null);
                  }}
                  className="h-7 w-48 text-sm"
                />
              ) : (
                <button
                  className="text-sm font-medium hover:underline focus:outline-none"
                  onClick={() => beginEdit(group)}
                  title="Click to rename"
                >
                  {group.label}
                </button>
              )}
              <span className="text-xs text-[hsl(var(--text-tertiary))]">
                ({group.fields.length} fields)
              </span>
              <button
                className="ml-auto text-[hsl(var(--text-tertiary))] hover:text-red-500"
                onClick={() => removeGroup(group.id)}
                title="Remove group (fields move to Others)"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Field pills */}
            <div className="flex flex-wrap gap-1.5">
              {group.fields.map((field) => {
                const label = FIELD_LABELS[field as keyof typeof FIELD_LABELS] ?? field;
                const otherGroups = groups.filter((g) => g.id !== group.id);
                return (
                  <span
                    key={field}
                    className="inline-flex items-center gap-0.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-2 py-0.5 text-xs"
                  >
                    {label}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="ml-0.5 opacity-50 hover:opacity-100">
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs">
                        {otherGroups.map((g) => (
                          <DropdownMenuItem
                            key={g.id}
                            onClick={() => moveField(field, group.id, g.id)}
                          >
                            Move to: {g.label}
                          </DropdownMenuItem>
                        ))}
                        {otherGroups.length === 0 && (
                          <DropdownMenuItem disabled>No other groups</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <button
                      className="ml-0.5 opacity-50 hover:opacity-100"
                      onClick={() => removeField(group.id, field)}
                      title="Remove from group (moves to Others)"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
              {group.fields.length === 0 && (
                <span className="text-xs text-[hsl(var(--text-tertiary))]">No fields</span>
              )}
            </div>
          </div>
        ))}

        {/* Others group — read-only, shown only when non-empty */}
        {othersFields.length > 0 && (
          <div className="rounded-lg border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-medium text-[hsl(var(--text-secondary))]">Others</span>
              <span className="text-xs text-[hsl(var(--text-tertiary))]">
                (auto-managed — {othersFields.length} unassigned fields)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {othersFields.map((field) => {
                const label = FIELD_LABELS[field as keyof typeof FIELD_LABELS] ?? field;
                return (
                  <span
                    key={field}
                    className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-[hsl(var(--border))] px-2 py-0.5 text-xs text-[hsl(var(--text-secondary))]"
                  >
                    {label}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="ml-0.5 opacity-50 hover:opacity-100">
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs">
                        {groups.map((g) => (
                          <DropdownMenuItem
                            key={g.id}
                            onClick={() => {
                              // Moving from Others = adding to a group
                              setDraft((prev) =>
                                (prev ?? editableGroups).map((gr) =>
                                  gr.id === g.id
                                    ? { ...gr, fields: [...gr.fields, field] }
                                    : gr
                                )
                              );
                            }}
                          >
                            Move to: {g.label}
                          </DropdownMenuItem>
                        ))}
                        {groups.length === 0 && (
                          <DropdownMenuItem disabled>No groups</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add group */}
      <div>
        <Button variant="outline" size="sm" onClick={addGroup} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Group
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No errors in `column-group-settings.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/settings/column-group-settings.tsx
git commit -m "feat: add ColumnGroupSettings editor component"
```

---

## Task 10: Add Column Groups tab to Settings page

**Files:**
- Modify: `app/(app)/settings/page.tsx`

- [ ] **Step 1: Add the import**

Add after the existing imports:
```ts
import { ColumnGroupSettings } from '@/components/settings/column-group-settings';
```

- [ ] **Step 2: Add the tab trigger and content**

In the `<TabsList>`, after the Access trigger:
```tsx
{showAccessTab && <TabsTrigger value="column-groups">Column Groups</TabsTrigger>}
```

After the Access `<TabsContent>`:
```tsx
{showAccessTab && (
  <TabsContent value="column-groups" className="mt-4">
    <ColumnGroupSettings />
  </TabsContent>
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npm run build`
Expected: Clean build.

- [ ] **Step 4: End-to-end test**

Start dev server (`npm run dev`). Sign in as admin.

1. Go to Settings → Column Groups tab. Confirm all 11 default groups appear with their fields.
2. Rename a group (click its name, type, press Enter). Click Save. Reload the page — renamed group persists.
3. Move a field from one group to another using the ▾ dropdown on the pill. Save. Reload — field is in the new group.
4. Remove a field from a group (click ×). Confirm it appears in the Others card below.
5. Move a field from Others back into a group. Save. Confirm Others card disappears if all fields are reassigned.
6. Add a new empty group. Name it. Save.
7. Remove a group. Confirm its fields move to Others.
8. Click "Reset to defaults". Confirm the 11 original groups are restored and the Reset button disappears.
9. Open a product detail sheet — confirm tabs reflect the current custom groups.
10. Open the Add Custom View dialog — confirm group list reflects custom groups.

- [ ] **Step 5: Commit**

```bash
git add app/(app)/settings/page.tsx
git commit -m "feat: add Column Groups tab to settings (admin-only)"
```

---

## Self-Review

**Spec coverage:**
- ✅ Admin-only: PUT/DELETE check `isAdmin()`. Tab uses same `showAccessTab` guard as Access tab.
- ✅ Reset to defaults: DELETE route removes document; fallback in `getColumnGroups()` returns hardcoded defaults; Reset button shown when `isDefault === false`.
- ✅ Others group: computed in `useColumnGroups()` hook and displayed read-only in editor; only shown when non-empty.
- ✅ Move fields between groups: ▾ dropdown on each pill.
- ✅ Rename groups: inline click-to-edit on group name.
- ✅ Add groups: "+ Add Group" button.
- ✅ Remove groups: Trash icon; fields fall to Others.
- ✅ Affects everywhere: all 5 consumers updated (Tasks 4–8).
- ✅ Save/Discard: local draft state, single PUT on Save.
- ✅ No blank flash: hook falls back to hardcoded defaults during load.
- ✅ id stability: `generateId()` called once at creation, label renames don't change `id`.
- ✅ Duplicate field prevention: implicit — a field can only exist in one group at a time (removeField before addField in moveField).

**Placeholder scan:** None found.

**Type consistency:**
- `ColumnGroup` defined in `lib/column-groups.ts`, imported in hook, route, and all components — consistent.
- `ColumnGroupsResponse` returned by GET and consumed by hook — consistent.
- `groups` property name used uniformly throughout.
