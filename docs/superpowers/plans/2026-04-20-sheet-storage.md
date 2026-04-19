# Sheet Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Sheet Storage" page where users can save, edit, delete, and search Google Sheet/Docs links with names, optional free-form tags, and optional team visibility.

**Architecture:** Follows the existing Shareables pattern: a `lib/sheet-links.ts` server module → two API routes → a client-rendered page with tabs (Mine / Team), a debounced search bar, and an add/edit dialog. MongoDB collection `sheetlinks` stores the documents.

**Tech Stack:** Next.js 16 App Router, MongoDB (via `lib/mongodb.ts`), SWR, shadcn/ui (Button, Badge, Input, Label, Switch, Dialog, Tabs), lucide-react, sonner (toasts).

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `lib/types.ts` | Add `SheetLink` interface |
| Create | `lib/sheet-links.ts` | Server-only DB access (CRUD + search) |
| Create | `app/api/sheet-links/route.ts` | GET (list) + POST (create) |
| Create | `app/api/sheet-links/[id]/route.ts` | PATCH (edit) + DELETE (remove) |
| Create | `app/(app)/sheet-links/page.tsx` | Page wrapper |
| Create | `app/(app)/sheet-links/sheet-links-client.tsx` | Full client component |
| Modify | `components/layout/sidebar.tsx` | Add Sheet Storage nav item |

---

## Task 1: Add SheetLink type

**Files:**
- Modify: `lib/types.ts` (after line 219, after the `ShareableLink` interface closing brace)

- [ ] **Step 1: Insert the SheetLink interface**

Open `lib/types.ts`. After the closing `}` of the `ShareableLink` interface (currently at line 219), add:

```ts
export interface SheetLink {
  _id: string;
  name: string;
  url: string;
  tags: string[];
  visibleToTeam: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run lint
```

Expected: no errors related to `SheetLink`.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add SheetLink type"
```

---

## Task 2: Create lib/sheet-links.ts

**Files:**
- Create: `lib/sheet-links.ts`

- [ ] **Step 1: Create the file**

Create `lib/sheet-links.ts` with the full content below:

```ts
import 'server-only';
import { ObjectId } from 'mongodb';
import { getDb } from './mongodb';
import type { SheetLink } from './types';

const COLLECTION = 'sheetlinks';

function toSheetLink(doc: Record<string, unknown>): SheetLink {
  return {
    _id: (doc._id as ObjectId).toString(),
    name: doc.name as string,
    url: doc.url as string,
    tags: (doc.tags as string[]) ?? [],
    visibleToTeam: doc.visibleToTeam as boolean,
    createdBy: doc.createdBy as string,
    createdAt: (doc.createdAt as Date).toISOString(),
    updatedAt: (doc.updatedAt as Date).toISOString(),
  };
}

export interface CreateSheetLinkInput {
  name: string;
  url: string;
  tags: string[];
  visibleToTeam: boolean;
  createdBy: string;
}

export interface UpdateSheetLinkInput {
  name?: string;
  url?: string;
  tags?: string[];
  visibleToTeam?: boolean;
}

function buildSearchFilter(query?: string) {
  if (!query?.trim()) return {};
  const regex = { $regex: query.trim(), $options: 'i' };
  return { $or: [{ name: regex }, { url: regex }, { tags: regex }] };
}

export async function createSheetLink(input: CreateSheetLinkInput): Promise<SheetLink> {
  const db = await getDb();
  const now = new Date();
  const result = await db.collection(COLLECTION).insertOne({
    name: input.name,
    url: input.url,
    tags: input.tags,
    visibleToTeam: input.visibleToTeam,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });
  const doc = await db.collection(COLLECTION).findOne({ _id: result.insertedId });
  return toSheetLink(doc as Record<string, unknown>);
}

export async function listSheetLinksMine(email: string, query?: string): Promise<SheetLink[]> {
  const db = await getDb();
  const filter = { createdBy: email, ...buildSearchFilter(query) };
  const docs = await db.collection(COLLECTION).find(filter).sort({ createdAt: -1 }).toArray();
  return docs.map((d) => toSheetLink(d as Record<string, unknown>));
}

export async function listSheetLinksTeam(email: string, query?: string): Promise<SheetLink[]> {
  const db = await getDb();
  const filter = { visibleToTeam: true, createdBy: { $ne: email }, ...buildSearchFilter(query) };
  const docs = await db.collection(COLLECTION).find(filter).sort({ createdAt: -1 }).toArray();
  return docs.map((d) => toSheetLink(d as Record<string, unknown>));
}

export async function updateSheetLink(
  id: string,
  email: string,
  patch: UpdateSheetLinkInput,
): Promise<'updated' | 'not_found' | 'forbidden'> {
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
  await db.collection(COLLECTION).updateOne(
    { _id: objectId },
    { $set: { ...patch, updatedAt: new Date() } },
  );
  return 'updated';
}

export async function deleteSheetLink(
  id: string,
  email: string,
): Promise<'deleted' | 'not_found' | 'forbidden'> {
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

- [ ] **Step 2: Verify lint passes**

```bash
npm run lint
```

Expected: no errors in `lib/sheet-links.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/sheet-links.ts
git commit -m "feat: add sheet-links data access module"
```

---

## Task 3: Create GET + POST API route

**Files:**
- Create: `app/api/sheet-links/route.ts`

- [ ] **Step 1: Create the directory and file**

Create `app/api/sheet-links/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSheetLink, listSheetLinksMine, listSheetLinksTeam } from '@/lib/sheet-links';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scope = req.nextUrl.searchParams.get('scope') ?? 'mine';
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const email = session.user.email;

  try {
    const links =
      scope === 'team'
        ? await listSheetLinksTeam(email, q)
        : await listSheetLinksMine(email, q);
    return NextResponse.json(links);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as {
    name: string;
    url: string;
    tags: string[];
    visibleToTeam: boolean;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!body.url?.trim()) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const link = await createSheetLink({
      name: body.name.trim(),
      url: body.url.trim(),
      tags: Array.isArray(body.tags) ? body.tags : [],
      visibleToTeam: body.visibleToTeam ?? false,
      createdBy: session.user.email,
    });
    return NextResponse.json(link, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/sheet-links/route.ts
git commit -m "feat: add sheet-links GET and POST API routes"
```

---

## Task 4: Create PATCH + DELETE API route

**Files:**
- Create: `app/api/sheet-links/[id]/route.ts`

- [ ] **Step 1: Create the directory and file**

Create `app/api/sheet-links/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateSheetLink, deleteSheetLink } from '@/lib/sheet-links';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json()) as {
    name?: string;
    url?: string;
    tags?: string[];
    visibleToTeam?: boolean;
  };

  try {
    const result = await updateSheetLink(id, session.user.email, body);
    if (result === 'not_found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (result === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await deleteSheetLink(id, session.user.email);
    if (result === 'not_found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (result === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/api/sheet-links/[id]/route.ts"
git commit -m "feat: add sheet-links PATCH and DELETE API routes"
```

---

## Task 5: Create page and client component

**Files:**
- Create: `app/(app)/sheet-links/page.tsx`
- Create: `app/(app)/sheet-links/sheet-links-client.tsx`

- [ ] **Step 1: Create the page wrapper**

Create `app/(app)/sheet-links/page.tsx`:

```tsx
import { SheetLinksClient } from './sheet-links-client';

export default function SheetLinksPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Sheet Storage</h1>
      <SheetLinksClient />
    </div>
  );
}
```

- [ ] **Step 2: Create the client component**

Create `app/(app)/sheet-links/sheet-links-client.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { ExternalLink, Edit2, Trash2, Plus, X, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { fetcher } from '@/lib/fetcher';
import type { SheetLink } from '@/lib/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function useDebounce(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Tag Input ────────────────────────────────────────────────────────────────

function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState('');

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = input.trim();
      if (trimmed && !tags.includes(trimmed)) {
        onChange([...tags, trimmed]);
      }
      setInput('');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1 min-h-[28px]">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="flex items-center gap-1 text-xs">
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="ml-0.5 hover:text-red-500"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a tag and press Enter"
        className="h-8 text-sm"
      />
    </div>
  );
}

// ── Add / Edit Dialog ────────────────────────────────────────────────────────

interface DialogState {
  open: boolean;
  mode: 'add' | 'edit';
  link?: SheetLink;
}

function LinkDialog({
  state,
  onClose,
  onSaved,
}: {
  state: DialogState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [visibleToTeam, setVisibleToTeam] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state.open) {
      setName(state.link?.name ?? '');
      setUrl(state.link?.url ?? '');
      setTags(state.link?.tags ?? []);
      setVisibleToTeam(state.link?.visibleToTeam ?? false);
    }
  }, [state.open, state.link]);

  const canSave = name.trim().length > 0 && url.trim().length > 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const body = { name: name.trim(), url: url.trim(), tags, visibleToTeam };
      const res =
        state.mode === 'add'
          ? await fetch('/api/sheet-links', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            })
          : await fetch(`/api/sheet-links/${state.link!._id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });

      if (res.ok) {
        toast.success(state.mode === 'add' ? 'Link saved' : 'Link updated');
        onSaved();
        onClose();
      } else {
        const data = await res.json();
        if (res.status === 403) {
          toast.error("You don't have permission to modify this link");
        } else {
          toast.error(data.error ?? 'Something went wrong');
        }
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={state.open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{state.mode === 'add' ? 'Add Link' : 'Edit Link'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sl-name">Name</Label>
            <Input
              id="sl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q1 Net Rates"
              className="h-8 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sl-url">URL</Label>
            <Input
              id="sl-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/…"
              className="h-8 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>
              Tags{' '}
              <span className="text-[hsl(var(--text-tertiary))] font-normal">(optional)</span>
            </Label>
            <TagInput tags={tags} onChange={setTags} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="sl-team" className="cursor-pointer">
              Share with team
            </Label>
            <Switch
              id="sl-team"
              checked={visibleToTeam}
              onCheckedChange={setVisibleToTeam}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!canSave || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Sheet Link Row ───────────────────────────────────────────────────────────

function SheetLinkRow({
  link,
  canEdit,
  onEdit,
  onDelete,
  onTagClick,
}: {
  link: SheetLink;
  canEdit: boolean;
  onEdit: (link: SheetLink) => void;
  onDelete: (id: string) => void;
  onTagClick: (tag: string) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{link.name}</p>
        <div className="mt-0.5 flex items-center gap-1 min-w-0">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-xs text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))] hover:underline flex items-center gap-1 min-w-0"
          >
            <span className="truncate">{link.url}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>
        {link.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {link.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-xs cursor-pointer hover:bg-[hsl(var(--surface))]"
                onClick={() => onTagClick(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <p className="mt-1 text-xs text-[hsl(var(--text-tertiary))]">
          {canEdit
            ? `Added ${formatDate(link.createdAt)}`
            : `by ${link.createdBy} · ${formatDate(link.createdAt)}`}
        </p>
      </div>
      {canEdit && (
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="Edit"
            onClick={() => onEdit(link)}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-[hsl(var(--text-tertiary))] hover:text-red-500"
            title="Delete"
            onClick={() => onDelete(link._id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
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

// ── Main Client ──────────────────────────────────────────────────────────────

export function SheetLinksClient() {
  const { mutate } = useSWRConfig();
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const [dialog, setDialog] = useState<DialogState>({ open: false, mode: 'add' });

  const myKey = `/api/sheet-links?scope=mine&q=${encodeURIComponent(q)}`;
  const teamKey = `/api/sheet-links?scope=team&q=${encodeURIComponent(q)}`;

  const { data: myLinks, isLoading: myLoading } = useSWR<SheetLink[]>(myKey, fetcher);
  const { data: teamLinks, isLoading: teamLoading } = useSWR<SheetLink[]>(teamKey, fetcher);

  function openAdd() {
    setDialog({ open: true, mode: 'add' });
  }

  function openEdit(link: SheetLink) {
    setDialog({ open: true, mode: 'edit', link });
  }

  function closeDialog() {
    setDialog((d) => ({ ...d, open: false }));
  }

  function handleSaved() {
    mutate(myKey);
    mutate(teamKey);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/sheet-links/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Link deleted');
      mutate(myKey);
    } else {
      const data = await res.json();
      if (res.status === 403) {
        toast.error("You don't have permission to delete this link");
      } else {
        toast.error(data.error ?? 'Something went wrong');
      }
    }
  }

  return (
    <>
      <LinkDialog state={dialog} onClose={closeDialog} onSaved={handleSaved} />

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--text-tertiary))]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search links, tags…"
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Button size="sm" onClick={openAdd} className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Link
        </Button>
      </div>

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
            <EmptyState
              message={q ? 'No links match your search.' : "You haven't saved any links yet."}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {myLinks.map((link) => (
                <SheetLinkRow
                  key={link._id}
                  link={link}
                  canEdit
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onTagClick={setSearch}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          {teamLoading ? (
            <p className="text-sm text-[hsl(var(--text-tertiary))]">Loading…</p>
          ) : !teamLinks?.length ? (
            <EmptyState
              message={
                q ? 'No team links match your search.' : 'No team links shared yet.'
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              {teamLinks.map((link) => (
                <SheetLinkRow
                  key={link._id}
                  link={link}
                  canEdit={false}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onTagClick={setSearch}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
```

- [ ] **Step 3: Verify lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/sheet-links/page.tsx" "app/(app)/sheet-links/sheet-links-client.tsx"
git commit -m "feat: add Sheet Storage page and client component"
```

---

## Task 6: Add sidebar nav item + final build check

**Files:**
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Add Database import to sidebar**

In `components/layout/sidebar.tsx`, find the lucide-react import line (currently imports `LayoutDashboard, Layers, Package, Settings, BookOpen, Share2, FileText, ChevronLeft, ChevronRight`). Add `Database` to that import:

```ts
import {
  LayoutDashboard,
  Layers,
  Package,
  Settings,
  BookOpen,
  Share2,
  FileText,
  Database,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
```

- [ ] **Step 2: Add nav item**

In the `navItems` array, after the `shareables` entry and before `settings`, add:

```ts
{ href: '/sheet-links', label: 'Sheet Storage', icon: Database },
```

The full array should look like:

```ts
const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/written-products', label: 'Written Products', icon: FileText },
  { href: '/assembly', label: 'Assembly Line', icon: Layers },
  { href: '/sources', label: 'Sources', icon: BookOpen },
  { href: '/shareables', label: 'Shareables', icon: Share2 },
  { href: '/sheet-links', label: 'Sheet Storage', icon: Database },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;
```

- [ ] **Step 3: Run production build to verify everything compiles**

```bash
npm run build
```

Expected: build completes with no type errors. There may be pre-existing warnings — only fail if there are new errors in files touched by this plan.

- [ ] **Step 4: Manual smoke test**

1. Start the dev server: `npm run dev`
2. Navigate to `http://localhost:3000/sheet-links`
3. Confirm "Sheet Storage" appears in the sidebar and is highlighted when active
4. Click "Add Link" — confirm dialog opens
5. Fill in Name + URL, add a tag (type + Enter), toggle "Share with team", click Save
6. Confirm the link appears in "My Links" with the tag badge
7. Click the tag badge — confirm search field updates and list filters
8. Click the edit (pencil) icon — confirm dialog opens pre-filled
9. Change the name, click Save — confirm the row updates
10. Click the delete (trash) icon — confirm the row is removed with a toast
11. Switch to "Team Links" — confirm team-shared links from other users appear (or empty state if none)

- [ ] **Step 5: Commit**

```bash
git add components/layout/sidebar.tsx
git commit -m "feat: add Sheet Storage nav item to sidebar"
```
