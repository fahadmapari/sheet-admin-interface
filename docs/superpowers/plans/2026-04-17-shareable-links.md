# Shareable Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow authenticated users to create public shareable links to a filtered, column-scoped view of live product data.

**Architecture:** Shareable link configs (title, expiry, columns, filters) are stored in a new MongoDB `shareablelinks` collection. Public links live at `/share/[token]` — a Next.js server component outside the auth route groups that fetches live sheet data via the service account and applies the stored filters server-side. A `middleware.ts` protects all app routes while bypassing `/share/**`.

**Tech Stack:** Next.js 16 App Router, MongoDB 7, NextAuth 4, TanStack Table, shadcn/ui, nanoid (to install)

---

## File Map

**New files:**
- `lib/shareables.ts` — MongoDB CRUD for the `shareablelinks` collection (server-only)
- `app/api/shareables/route.ts` — POST (create) + GET (list)
- `app/api/shareables/[id]/route.ts` — DELETE (creator only)
- `middleware.ts` — Next.js middleware, protects app routes, bypasses `/share/**`
- `components/products/create-shareable-link-dialog.tsx` — creation modal
- `app/share/[token]/page.tsx` — public server-rendered share page
- `components/share/shareable-product-table.tsx` — read-only interactive table for public page
- `app/(app)/shareables/shareables-client.tsx` — client component for the Shareables page list

**Modified files:**
- `lib/types.ts` — add `ShareableLink` interface
- `components/products/export-button.tsx` — add `filters` prop + "Create Shareable Link" menu item
- `app/(app)/products/products-client.tsx` — pass `filters` to `ExportButton`
- `app/(app)/shareables/page.tsx` — replace "Coming Soon" with `ShareablesClient`

---

## Task 1: Install nanoid + add ShareableLink type

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Install nanoid**

```bash
cd e:/projects/sheet-admin && npm install nanoid
```

Expected: nanoid added to `node_modules` and `package.json` dependencies.

- [ ] **Step 2: Add ShareableLink interface to lib/types.ts**

Add to the bottom of `lib/types.ts` (after the `NotificationSubscription` interface):

```ts
export interface ShareableLink {
  _id: string;        // MongoDB ObjectId as string
  token: string;      // nanoid(12) — used in /share/<token>
  title: string;
  createdBy: string;  // email of creator
  createdAt: string;  // ISO date string
  expiresAt: string | null; // ISO date string or null
  visibleToTeam: boolean;
  columns: string[];  // TourProduct field keys to display
  filters: import('./product-filters').Filters;
}
```

- [ ] **Step 3: Verify lint passes**

```bash
cd e:/projects/sheet-admin && npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd e:/projects/sheet-admin && git add lib/types.ts package.json package-lock.json && git commit -m "feat: install nanoid, add ShareableLink type"
```

---

## Task 2: Create lib/shareables.ts

**Files:**
- Create: `lib/shareables.ts`

- [ ] **Step 1: Create the file**

Create `lib/shareables.ts`:

```ts
import 'server-only';
import { ObjectId } from 'mongodb';
import { nanoid } from 'nanoid';
import { getDb } from './mongodb';
import type { ShareableLink } from './types';
import type { Filters } from './product-filters';

const COLLECTION = 'shareablelinks';

export interface CreateShareableLinkInput {
  title: string;
  expiresAt: string | null;
  visibleToTeam: boolean;
  columns: string[];
  filters: Filters;
  createdBy: string;
}

export async function createShareableLink(input: CreateShareableLinkInput): Promise<string> {
  const db = await getDb();
  const token = nanoid(12);
  await db.collection(COLLECTION).insertOne({
    token,
    title: input.title,
    createdBy: input.createdBy,
    createdAt: new Date(),
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    visibleToTeam: input.visibleToTeam,
    columns: input.columns,
    filters: input.filters,
  });
  return token;
}

export async function getShareableLinkByToken(token: string): Promise<ShareableLink | null> {
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ token });
  if (!doc) return null;
  return {
    _id: doc._id.toString(),
    token: doc.token as string,
    title: doc.title as string,
    createdBy: doc.createdBy as string,
    createdAt: (doc.createdAt as Date).toISOString(),
    expiresAt: doc.expiresAt ? (doc.expiresAt as Date).toISOString() : null,
    visibleToTeam: doc.visibleToTeam as boolean,
    columns: doc.columns as string[],
    filters: doc.filters as Filters,
  };
}

export async function listShareableLinksMine(email: string): Promise<ShareableLink[]> {
  const db = await getDb();
  const docs = await db.collection(COLLECTION)
    .find({ createdBy: email })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((doc) => ({
    _id: doc._id.toString(),
    token: doc.token as string,
    title: doc.title as string,
    createdBy: doc.createdBy as string,
    createdAt: (doc.createdAt as Date).toISOString(),
    expiresAt: doc.expiresAt ? (doc.expiresAt as Date).toISOString() : null,
    visibleToTeam: doc.visibleToTeam as boolean,
    columns: doc.columns as string[],
    filters: doc.filters as Filters,
  }));
}

export async function listShareableLinksTeam(email: string): Promise<ShareableLink[]> {
  const db = await getDb();
  const docs = await db.collection(COLLECTION)
    .find({ visibleToTeam: true, createdBy: { $ne: email } })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((doc) => ({
    _id: doc._id.toString(),
    token: doc.token as string,
    title: doc.title as string,
    createdBy: doc.createdBy as string,
    createdAt: (doc.createdAt as Date).toISOString(),
    expiresAt: doc.expiresAt ? (doc.expiresAt as Date).toISOString() : null,
    visibleToTeam: doc.visibleToTeam as boolean,
    columns: doc.columns as string[],
    filters: doc.filters as Filters,
  }));
}

export async function deleteShareableLink(id: string, email: string): Promise<'deleted' | 'not_found' | 'forbidden'> {
  const db = await getDb();
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return 'not_found';
  }
  const doc = await db.collection(COLLECTION).findOne({ _id: objectId });
  if (!doc) return 'not_found';
  if (doc.createdBy !== email) return 'forbidden';
  await db.collection(COLLECTION).deleteOne({ _id: objectId });
  return 'deleted';
}
```

- [ ] **Step 2: Verify lint**

```bash
cd e:/projects/sheet-admin && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd e:/projects/sheet-admin && git add lib/shareables.ts && git commit -m "feat: add shareables MongoDB CRUD helpers"
```

---

## Task 3: Create middleware.ts

**Files:**
- Create: `middleware.ts` (project root, next to `package.json`)

- [ ] **Step 1: Create middleware.ts**

Create `middleware.ts` at the project root (`e:/projects/sheet-admin/middleware.ts`):

```ts
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|login|share|favicon.ico).*)',
  ],
};
```

This protects all routes by default. The negative lookahead excludes:
- `api/auth` — NextAuth endpoints
- `_next/static` / `_next/image` — Next.js assets
- `login` — sign-in page
- `share` — public shareable link pages

- [ ] **Step 2: Run dev server and verify auth still works**

```bash
cd e:/projects/sheet-admin && npm run dev
```

Open `http://localhost:3000` — should redirect to `/login` if not signed in. Open `http://localhost:3000/share/anything` — should render (not redirect), even if the page content shows an error about the token not being found (that's expected, the page isn't built yet).

- [ ] **Step 3: Commit**

```bash
cd e:/projects/sheet-admin && git add middleware.ts && git commit -m "feat: add auth middleware, bypass /share/** routes"
```

---

## Task 4: Create POST + GET /api/shareables

**Files:**
- Create: `app/api/shareables/route.ts`

- [ ] **Step 1: Create the route file**

Create `app/api/shareables/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createShareableLink,
  listShareableLinksMine,
  listShareableLinksTeam,
} from '@/lib/shareables';
import type { Filters } from '@/lib/product-filters';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as {
    title: string;
    expiresAt: string | null;
    visibleToTeam: boolean;
    columns: string[];
    filters: Filters;
  };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }
  if (!Array.isArray(body.columns) || body.columns.length === 0) {
    return NextResponse.json({ error: 'At least one column is required' }, { status: 400 });
  }

  try {
    const token = await createShareableLink({
      title: body.title.trim(),
      expiresAt: body.expiresAt ?? null,
      visibleToTeam: body.visibleToTeam ?? false,
      columns: body.columns,
      filters: body.filters,
      createdBy: session.user.email,
    });
    return NextResponse.json({ token });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scope = req.nextUrl.searchParams.get('scope') ?? 'mine';
  const email = session.user.email;

  try {
    const links = scope === 'team'
      ? await listShareableLinksTeam(email)
      : await listShareableLinksMine(email);
    return NextResponse.json(links);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify lint**

```bash
cd e:/projects/sheet-admin && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd e:/projects/sheet-admin && git add app/api/shareables/route.ts && git commit -m "feat: add POST and GET /api/shareables endpoints"
```

---

## Task 5: Create DELETE /api/shareables/[id]

**Files:**
- Create: `app/api/shareables/[id]/route.ts`

- [ ] **Step 1: Create the route file**

Create `app/api/shareables/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteShareableLink } from '@/lib/shareables';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const result = await deleteShareableLink(id, session.user.email);

  if (result === 'not_found') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (result === 'forbidden') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify lint**

```bash
cd e:/projects/sheet-admin && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd e:/projects/sheet-admin && git add "app/api/shareables/[id]/route.ts" && git commit -m "feat: add DELETE /api/shareables/[id] endpoint"
```

---

## Task 6: Wire filters prop through ExportButton

**Files:**
- Modify: `components/products/export-button.tsx`
- Modify: `app/(app)/products/products-client.tsx`

- [ ] **Step 1: Add filters prop to ExportButton**

In `components/products/export-button.tsx`, update the `ExportButtonProps` interface and component signature:

```ts
// Old:
interface ExportButtonProps {
  products: TourProduct[];
  columnVisibility: VisibilityState;
}

// New:
import type { Filters } from '@/lib/product-filters';

interface ExportButtonProps {
  products: TourProduct[];
  columnVisibility: VisibilityState;
  filters: Filters;
}
```

Update the component signature:
```ts
// Old:
export function ExportButton({ products, columnVisibility }: ExportButtonProps) {

// New:
export function ExportButton({ products, columnVisibility, filters }: ExportButtonProps) {
```

The `filters` prop will be used in Task 7 when the dialog is added. For now, just thread it through.

- [ ] **Step 2: Pass filters from products-client.tsx to ExportButton**

In `app/(app)/products/products-client.tsx`, find the `<ExportButton>` usage (around line 362):

```tsx
// Old:
<ExportButton products={searchedProducts} columnVisibility={columnVisibility} />

// New:
<ExportButton products={searchedProducts} columnVisibility={columnVisibility} filters={filters} />
```

- [ ] **Step 3: Verify lint**

```bash
cd e:/projects/sheet-admin && npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd e:/projects/sheet-admin && git add components/products/export-button.tsx "app/(app)/products/products-client.tsx" && git commit -m "feat: thread filters prop through ExportButton"
```

---

## Task 7: Create CreateShareableLinkDialog

**Files:**
- Create: `components/products/create-shareable-link-dialog.tsx`
- Modify: `components/products/export-button.tsx`

- [ ] **Step 1: Create the dialog component**

Create `components/products/create-shareable-link-dialog.tsx`:

```tsx
'use client';

import { useState, useMemo } from 'react';
import { Copy, Check, Link } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useColumnGroups } from '@/lib/hooks/use-column-groups';
import { FIELD_LABELS } from '@/lib/constants';
import type { VisibilityState } from '@tanstack/react-table';
import type { Filters } from '@/lib/product-filters';
import {
  MULTI_SELECT_FILTERS,
  TRI_STATE_FILTERS,
  PRESENCE_FILTERS,
} from '@/lib/product-filters';

// Maps composite TanStack column IDs to the underlying raw field IDs
const COMPOSITE_TO_FIELDS: Record<string, string[]> = {
  product: ['productName', 'duration'],
  location: ['city', 'country'],
  type: ['productType'],
  status: ['productStatus'],
};

type ExpiryOption = '7d' | '30d' | '90d' | '1y' | 'never';

const EXPIRY_OPTIONS: { label: string; value: ExpiryOption }[] = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
  { label: '1 year', value: '1y' },
  { label: 'Never', value: 'never' },
];

function expiryToIso(option: ExpiryOption): string | null {
  if (option === 'never') return null;
  const days = option === '7d' ? 7 : option === '30d' ? 30 : option === '90d' ? 90 : 365;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function getFilterSummary(filters: Filters): string {
  const parts: string[] = [];

  for (const { key, label } of MULTI_SELECT_FILTERS) {
    const values = filters[key];
    if (Array.isArray(values) && values.length > 0) {
      parts.push(`${label}: ${values.join(', ')}`);
    }
  }
  for (const { key, label } of TRI_STATE_FILTERS) {
    const val = filters[key];
    if (val !== 'all') {
      parts.push(`${label}: ${val === 'yes' ? 'Yes' : 'No'}`);
    }
  }
  for (const { key, label } of PRESENCE_FILTERS) {
    const val = filters[key];
    if (val !== 'all') {
      parts.push(`${label}: ${val === 'has' ? 'Has value' : 'Missing'}`);
    }
  }

  return parts.length > 0 ? parts.join(' · ') : 'All products';
}

interface CreateShareableLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnVisibility: VisibilityState;
  filters: Filters;
  productCount: number;
}

export function CreateShareableLinkDialog({
  open,
  onOpenChange,
  columnVisibility,
  filters,
  productCount,
}: CreateShareableLinkDialogProps) {
  const { groups } = useColumnGroups();

  // All raw field IDs that are currently visible (resolve composite columns)
  const initialColumns = useMemo(() => {
    const visible = new Set<string>();
    for (const [compositeId, fields] of Object.entries(COMPOSITE_TO_FIELDS)) {
      if (columnVisibility[compositeId] === true) {
        for (const f of fields) visible.add(f);
      }
    }
    const allRawFields = groups.flatMap((g) => g.fields);
    for (const field of allRawFields) {
      if (columnVisibility[field] === true) visible.add(field);
    }
    return visible;
  }, [columnVisibility, groups]);

  const [title, setTitle] = useState('');
  const [expiry, setExpiry] = useState<ExpiryOption>('never');
  const [visibleToTeam, setVisibleToTeam] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(initialColumns));
  const [isCreating, setIsCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl = createdToken
    ? `${window.location.origin}/share/${createdToken}`
    : '';

  function handleColumnToggle(fieldId: string, checked: boolean) {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (checked) next.add(fieldId);
      else next.delete(fieldId);
      return next;
    });
  }

  async function handleCreate() {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (selectedColumns.size === 0) {
      toast.error('Please select at least one column');
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/shareables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          expiresAt: expiryToIso(expiry),
          visibleToTeam,
          columns: Array.from(selectedColumns),
          filters,
        }),
      });
      const data = await res.json() as { token?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to create link');
      setCreatedToken(data.token!);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create link');
    } finally {
      setIsCreating(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    onOpenChange(false);
    // Reset state after dialog closes
    setTimeout(() => {
      setTitle('');
      setExpiry('never');
      setVisibleToTeam(false);
      setSelectedColumns(new Set(initialColumns));
      setCreatedToken(null);
      setCopied(false);
    }, 200);
  }

  const filterSummary = useMemo(() => getFilterSummary(filters), [filters]);

  if (createdToken) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Shareable Link Created
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-[hsl(var(--text-secondary))]">
              Your link is ready. Anyone with this URL can view the data.
            </p>
            <div className="flex items-center gap-2 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2">
              <span className="flex-1 truncate text-sm font-mono">{shareUrl}</span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={handleCopy}>
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Create Shareable Link
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="share-title">Title</Label>
            <Input
              id="share-title"
              placeholder="e.g. France products for review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Expiry */}
          <div className="flex flex-col gap-1.5">
            <Label>Expiry</Label>
            <div className="flex flex-wrap gap-2">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setExpiry(opt.value)}
                  className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                    expiry === opt.value
                      ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                      : 'border-[hsl(var(--border))] bg-[hsl(var(--surface))] hover:bg-[hsl(var(--surface-hover))]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Visible to team */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="share-team">Visible to team</Label>
              <p className="mt-0.5 text-xs text-[hsl(var(--text-tertiary))]">
                Show this link in teammates' Team Links tab
              </p>
            </div>
            <Switch
              id="share-team"
              checked={visibleToTeam}
              onCheckedChange={setVisibleToTeam}
            />
          </div>

          {/* Active filters */}
          <div className="flex flex-col gap-1.5">
            <Label>Active filters</Label>
            <p className="text-sm text-[hsl(var(--text-secondary))] leading-relaxed">
              {filterSummary}
            </p>
            <p className="text-xs text-[hsl(var(--text-tertiary))]">
              {productCount} product{productCount !== 1 ? 's' : ''} will be visible
            </p>
          </div>

          {/* Columns */}
          <div className="flex flex-col gap-1.5">
            <Label>Columns ({selectedColumns.size} selected)</Label>
            <ScrollArea className="h-48 rounded-md border border-[hsl(var(--border))] p-3">
              <div className="flex flex-col gap-3">
                {groups.map((group) => (
                  <div key={group.id}>
                    <p className="mb-1.5 text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase tracking-wide">
                      {group.label}
                    </p>
                    <div className="flex flex-col gap-1">
                      {group.fields.map((fieldId) => (
                        <div key={fieldId} className="flex items-center gap-2">
                          <Checkbox
                            id={`col-${fieldId}`}
                            checked={selectedColumns.has(fieldId)}
                            onCheckedChange={(checked) => handleColumnToggle(fieldId, !!checked)}
                          />
                          <label
                            htmlFor={`col-${fieldId}`}
                            className="text-sm cursor-pointer select-none"
                          >
                            {FIELD_LABELS[fieldId as keyof typeof FIELD_LABELS] ?? fieldId}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isCreating || !title.trim() || selectedColumns.size === 0}>
            {isCreating ? 'Creating…' : 'Create Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Add "Create Shareable Link" to ExportButton**

In `components/products/export-button.tsx`:

Add import at the top:
```ts
import { useState } from 'react';
import { Link } from 'lucide-react';
import { CreateShareableLinkDialog } from '@/components/products/create-shareable-link-dialog';
import type { Filters } from '@/lib/product-filters';
```

Update `ExportButtonProps`:
```ts
interface ExportButtonProps {
  products: TourProduct[];
  columnVisibility: VisibilityState;
  filters: Filters;
}
```

Update component (add state for dialog and menu item):
```tsx
export function ExportButton({ products, columnVisibility, filters }: ExportButtonProps) {
  const { groups } = useColumnGroups();
  const visibleFields = getVisibleFields(columnVisibility, groups);
  const [exportingToSheets, setExportingToSheets] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // ... keep existing exportToGoogleSheets function unchanged ...

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="mr-1 h-4 w-4" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => { exportCsv(products, visibleFields); toast.success(`Exported ${products.length} rows as CSV`); }}>
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={async () => { await exportXlsx(products, visibleFields); toast.success(`Exported ${products.length} rows as XLSX`); }}>
            Export as XLSX
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={exportToGoogleSheets}
            disabled={exportingToSheets}
          >
            Export to Google Sheets
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShareDialogOpen(true)}>
            <Link className="mr-2 h-4 w-4" />
            Create Shareable Link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateShareableLinkDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        columnVisibility={columnVisibility}
        filters={filters}
        productCount={products.length}
      />
    </>
  );
}
```

Note: The existing `useState` import at the top of `export-button.tsx` may need to be added if not already present. Check line 1 of the file — it already has `import { useState } from 'react'`.

- [ ] **Step 3: Verify lint**

```bash
cd e:/projects/sheet-admin && npm run lint
```

Expected: no errors.

- [ ] **Step 4: Test the dialog manually**

Start dev server: `npm run dev`

Navigate to `http://localhost:3000/products`. Click **Export** → **Create Shareable Link**. Verify:
- Dialog opens with title input, expiry buttons, team toggle, filter summary, and column checkboxes
- Filter summary shows active filters or "All products"
- Columns are pre-checked based on current view
- "Create Link" button is disabled when title is empty
- After entering a title and clicking Create, the success state shows with a copyable URL

- [ ] **Step 5: Commit**

```bash
cd e:/projects/sheet-admin && git add components/products/create-shareable-link-dialog.tsx components/products/export-button.tsx && git commit -m "feat: add CreateShareableLinkDialog and wire into ExportButton"
```

---

## Task 8: Create ShareableProductTable + public share page

**Files:**
- Create: `components/share/shareable-product-table.tsx`
- Create: `app/share/[token]/page.tsx`

- [ ] **Step 1: Create ShareableProductTable**

Create `components/share/shareable-product-table.tsx`:

```tsx
'use client';

import { useMemo, useRef, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FIELD_LABELS } from '@/lib/constants';
import { parseLinkField } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { TourProduct } from '@/lib/types';

interface ShareableProductTableProps {
  products: TourProduct[];
  columns: string[];
}

function buildColumns(fieldIds: string[]): ColumnDef<TourProduct>[] {
  return fieldIds.map((fieldId) => ({
    id: fieldId,
    accessorKey: fieldId,
    header: FIELD_LABELS[fieldId as keyof typeof FIELD_LABELS] ?? fieldId,
    cell: ({ row }: { row: { original: TourProduct } }) => {
      const value = row.original[fieldId as keyof TourProduct];
      if (value === null || value === undefined || value === '') {
        return <span className="text-[hsl(var(--text-tertiary))]">–</span>;
      }
      if (typeof value === 'boolean') {
        return <span>{value ? 'Yes' : 'No'}</span>;
      }
      // Render link fields with clickable links
      if (fieldId === 'link' || fieldId === 'productLink' || fieldId === 'providerUrl') {
        const str = String(value);
        const parsed = parseLinkField(str);
        if (parsed.url) {
          return (
            <a
              href={parsed.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[hsl(var(--primary))] underline underline-offset-2 hover:opacity-80"
            >
              {parsed.text || parsed.url}
            </a>
          );
        }
      }
      return <span className="whitespace-nowrap">{String(value)}</span>;
    },
  }));
}

export function ShareableProductTable({ products, columns }: ShareableProductTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);

  const columnDefs = useMemo(() => buildColumns(columns), [columns]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter((p) =>
      columns.some((col) => {
        const val = p[col as keyof TourProduct];
        return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
      })
    );
  }, [products, search, columns]);

  const table = useReactTable({
    data: filteredProducts,
    columns: columnDefs,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0
    ? totalSize - virtualItems[virtualItems.length - 1].end
    : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--text-tertiary))]" />
        <Input
          className="w-full max-w-sm pl-8 pr-8"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))]"
            onClick={() => setSearch('')}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="text-sm text-[hsl(var(--text-tertiary))]">
        {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
      </p>
      <div
        ref={parentRef}
        className="overflow-auto rounded-md border border-[hsl(var(--border))]"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[hsl(var(--surface))]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className="border-b border-[hsl(var(--border))] px-3 py-2 text-left text-xs font-medium text-[hsl(var(--text-secondary))] whitespace-nowrap cursor-pointer select-none hover:bg-[hsl(var(--surface-hover))]"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <span className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === 'asc' ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : sorted === 'desc' ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {paddingTop > 0 && <tr><td style={{ height: paddingTop }} /></tr>}
            {virtualItems.map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-[hsl(var(--border))] last:border-0',
                    virtualRow.index % 2 === 0 ? 'bg-background' : 'bg-[hsl(var(--surface))]'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 text-sm whitespace-nowrap max-w-[300px] truncate">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
            {paddingBottom > 0 && <tr><td style={{ height: paddingBottom }} /></tr>}
          </tbody>
        </table>
        {filteredProducts.length === 0 && (
          <div className="flex items-center justify-center py-16 text-sm text-[hsl(var(--text-tertiary))]">
            No products found
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the public share page**

Create `app/share/[token]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { getShareableLinkByToken } from '@/lib/shareables';
import { fetchAllRows, fetchColumnHyperlinks, fetchColumnRichTextLinks } from '@/lib/sheets';
import { getEffectiveColumnMap } from '@/lib/column-mapping';
import { rowToProduct } from '@/lib/utils';
import {
  MULTI_SELECT_FILTERS,
  TRI_STATE_FILTERS,
  PRESENCE_FILTERS,
  matchesMultiFilter,
  matchesTriStateFilter,
  matchesPresenceFilter,
} from '@/lib/product-filters';
import { ShareableProductTable } from '@/components/share/shareable-product-table';
import type { TourProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;

  // Load link config
  const link = await getShareableLinkByToken(token);

  if (!link) {
    return <ExpiredState />;
  }

  // Check expiry
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return <ExpiredState />;
  }

  // Fetch live data via service account
  const sheetsAuth = { auth: 'service' as const };
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

  const allProducts: TourProduct[] = rows
    .slice(1)
    .map((row, i) => {
      const rowIndex = i + 2;
      return rowToProduct(row, rowIndex, linkHyperlinks.get(rowIndex), imageLinksRichText.get(rowIndex), colMap);
    });

  // Apply stored filters server-side
  const filteredProducts = allProducts.filter((p) => {
    for (const { key, productKey } of MULTI_SELECT_FILTERS) {
      if (!matchesMultiFilter(p[productKey], link.filters[key])) return false;
    }
    for (const { key, productKey } of TRI_STATE_FILTERS) {
      if (!matchesTriStateFilter(p[productKey], link.filters[key])) return false;
    }
    for (const { key, productKey } of PRESENCE_FILTERS) {
      if (!matchesPresenceFilter(p[productKey], link.filters[key])) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-screen-xl px-4 py-8 md:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">{link.title}</h1>
          <p className="mt-1 text-sm text-[hsl(var(--text-tertiary))]">
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <ShareableProductTable products={filteredProducts} columns={link.columns} />
      </div>
      <footer className="mt-12 border-t border-[hsl(var(--border))] py-4 text-center text-xs text-[hsl(var(--text-tertiary))]">
        Powered by Sheet Admin
      </footer>
    </div>
  );
}

function ExpiredState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <p className="text-lg font-medium text-[hsl(var(--text-primary))]">
          This link is no longer available
        </p>
        <p className="mt-1 text-sm text-[hsl(var(--text-tertiary))]">
          The shareable link has expired or been removed.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify lint**

```bash
cd e:/projects/sheet-admin && npm run lint
```

Expected: no errors.

- [ ] **Step 4: Test the public share page manually**

1. Create a shareable link from the products page
2. Copy the URL from the success state (e.g. `http://localhost:3000/share/abc123xyz`)
3. Open it in an incognito/private window (no session cookie)
4. Verify the page loads with the title, product count, and correct columns
5. Verify sorting and search work
6. Verify only products matching the saved filters are shown
7. Open `http://localhost:3000/share/nonexistent` — should show "This link is no longer available"

- [ ] **Step 5: Commit**

```bash
cd e:/projects/sheet-admin && git add "components/share/shareable-product-table.tsx" "app/share/[token]/page.tsx" && git commit -m "feat: add public share page and ShareableProductTable"
```

---

## Task 9: Build the Shareables page

**Files:**
- Create: `app/(app)/shareables/shareables-client.tsx`
- Modify: `app/(app)/shareables/page.tsx`

- [ ] **Step 1: Create the client component**

Create `app/(app)/shareables/shareables-client.tsx`:

```tsx
'use client';

import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { Copy, Check, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetcher } from '@/lib/fetcher';
import type { ShareableLink } from '@/lib/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function isExpired(link: ShareableLink) {
  return !!link.expiresAt && new Date(link.expiresAt) < new Date();
}

function expiryLabel(link: ShareableLink) {
  if (!link.expiresAt) return 'Never';
  if (isExpired(link)) return 'Expired';
  return formatDate(link.expiresAt);
}

function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(`${window.location.origin}/share/${token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleCopy} title="Copy link">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function ShareableLinkRow({
  link,
  canDelete,
  onDelete,
}: {
  link: ShareableLink;
  canDelete: boolean;
  onDelete: (id: string) => void;
}) {
  const expired = isExpired(link);
  return (
    <div className={`flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] px-4 py-3 ${expired ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-sm">{link.title}</span>
          {expired && <Badge variant="outline" className="shrink-0 text-xs">Expired</Badge>}
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-[hsl(var(--text-tertiary))]">
          <span>Created {formatDate(link.createdAt)}</span>
          <span>·</span>
          <span>Expires: {expiryLabel(link)}</span>
          <span>·</span>
          <span>{link.columns.length} column{link.columns.length !== 1 ? 's' : ''}</span>
          {canDelete && (
            <>
              <span>·</span>
              <span>by you</span>
            </>
          )}
          {!canDelete && (
            <>
              <span>·</span>
              <span>by {link.createdBy}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <CopyLinkButton token={link.token} />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          title="Open link"
          onClick={() => window.open(`/share/${link.token}`, '_blank')}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-[hsl(var(--text-tertiary))] hover:text-red-500"
            title="Delete link"
            onClick={() => onDelete(link._id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm font-medium text-[hsl(var(--text-primary))]">{message}</p>
    </div>
  );
}

export function ShareablesClient() {
  const { mutate } = useSWRConfig();
  const { data: myLinks, isLoading: myLoading } = useSWR<ShareableLink[]>(
    '/api/shareables?scope=mine',
    fetcher,
  );
  const { data: teamLinks, isLoading: teamLoading } = useSWR<ShareableLink[]>(
    '/api/shareables?scope=team',
    fetcher,
  );

  async function handleDelete(id: string) {
    const res = await fetch(`/api/shareables/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Link deleted');
      mutate('/api/shareables?scope=mine');
    } else {
      toast.error('Failed to delete link');
    }
  }

  return (
    <Tabs defaultValue="mine">
      <TabsList>
        <TabsTrigger value="mine">
          My Links {myLinks ? `(${myLinks.length})` : ''}
        </TabsTrigger>
        <TabsTrigger value="team">
          Team Links {teamLinks ? `(${teamLinks.length})` : ''}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="mine" className="mt-4">
        {myLoading ? (
          <p className="text-sm text-[hsl(var(--text-tertiary))]">Loading…</p>
        ) : !myLinks?.length ? (
          <EmptyState message="You haven't created any shareable links yet." />
        ) : (
          <div className="flex flex-col gap-2">
            {myLinks.map((link) => (
              <ShareableLinkRow
                key={link._id}
                link={link}
                canDelete
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="team" className="mt-4">
        {teamLoading ? (
          <p className="text-sm text-[hsl(var(--text-tertiary))]">Loading…</p>
        ) : !teamLinks?.length ? (
          <EmptyState message="No team links shared yet." />
        ) : (
          <div className="flex flex-col gap-2">
            {teamLinks.map((link) => (
              <ShareableLinkRow
                key={link._id}
                link={link}
                canDelete={false}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 2: Replace the Coming Soon placeholder in page.tsx**

Replace the entire contents of `app/(app)/shareables/page.tsx` with:

```tsx
import { ShareablesClient } from './shareables-client';

export default function ShareablesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Shareables</h1>
      <ShareablesClient />
    </div>
  );
}
```

- [ ] **Step 3: Verify lint**

```bash
cd e:/projects/sheet-admin && npm run lint
```

Expected: no errors.

- [ ] **Step 4: Test the Shareables page manually**

Navigate to `http://localhost:3000/shareables`.

1. **My Links tab** — shows all links you created; each row has title, created date, expiry, column count, copy/open/delete buttons
2. Create a link with "Visible to team" ON — verify it appears in a teammate's Team Links tab
3. **Team Links tab** — shows links from other team members with `visibleToTeam: true`; copy and open buttons only (no delete)
4. Click Delete on a My Links entry — link removed and toast shows
5. Expired links should appear with muted styling and "Expired" badge

- [ ] **Step 5: Commit**

```bash
cd e:/projects/sheet-admin && git add "app/(app)/shareables/shareables-client.tsx" "app/(app)/shareables/page.tsx" && git commit -m "feat: build Shareables page with My Links and Team Links tabs"
```

---

## Task 10: Final build verification

- [ ] **Step 1: Run production build**

```bash
cd e:/projects/sheet-admin && npm run build
```

Expected: builds successfully with no errors. Type errors or missing imports will surface here.

- [ ] **Step 2: Fix any build errors**

Common issues to watch for:
- `'server-only'` imports in client components — check that `lib/shareables.ts` and `lib/sheets.ts` are not imported from any `'use client'` file
- Missing `await params` in Next.js 16 route handlers — already handled in the plan
- Type mismatches between `Filters` stored in MongoDB and the imported type

- [ ] **Step 3: Commit any fixes**

```bash
cd e:/projects/sheet-admin && git add -A && git commit -m "fix: resolve build errors from shareable links feature"
```

- [ ] **Step 4: End-to-end smoke test**

1. Go to `/products`, apply a country filter (e.g. France), open **Export → Create Shareable Link**
2. Enter a title, set expiry to 30 days, enable "Visible to team", select a subset of columns, click **Create Link**
3. Copy the link URL and open it in an incognito window — should see the title, filtered products, only the selected columns
4. Sort a column, search for a product — verify interactivity works
5. Go to `/shareables` → My Links — see the link you created
6. Switch to Team Links — see it there too (since visibleToTeam was on)
7. Delete the link from My Links — it disappears from both tabs
8. Open the deleted link URL in incognito — "This link is no longer available"
