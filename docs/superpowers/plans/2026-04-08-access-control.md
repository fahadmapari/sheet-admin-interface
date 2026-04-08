# Access Control Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the email allowlist from the `ALLOWED_EMAILS` env variable to MongoDB and add an Access tab in Settings for managing allowed users and admins.

**Architecture:** A single `accesscontrol` MongoDB document stores `allowAll`, `allowedEmails`, and `adminEmails`. A new `lib/access-control.ts` helper (with 30s in-memory cache) encapsulates all reads/writes. `lib/auth.ts` is updated to use it; two new API routes serve the settings UI; the settings page conditionally renders an Access tab for admin emails only.

**Tech Stack:** Next.js 14 App Router, MongoDB (via existing `lib/mongodb.ts`), NextAuth, shadcn/ui (Switch, Label, Input, Button), React `useTransition`

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `lib/access-control.ts` | DB helper: getAccessControl, updateAccessControl, isAdmin, 30s cache |
| Modify | `lib/auth.ts` | Replace env-based signIn check with getAccessControl() |
| Create | `app/api/access-control/route.ts` | GET + PUT handlers, admin-guarded |
| Create | `components/settings/access-control-settings.tsx` | Client component: Allow All toggle, Allowed Emails, Admin Emails |
| Modify | `app/(app)/settings/page.tsx` | Convert to async server component, add Access tab for admins |

---

## Task 1: Create `lib/access-control.ts`

**Files:**
- Create: `lib/access-control.ts`

- [ ] **Step 1: Create the file with the full implementation**

```typescript
import 'server-only';
import { getDb } from './mongodb';

export interface AccessControlDoc {
  allowAll: boolean;
  allowedEmails: string[];
  adminEmails: string[];
}

const COLLECTION = 'accesscontrol';
const DEFAULT_ADMIN = 'btechy4@gmail.com';

let cache: { doc: AccessControlDoc; expiresAt: number } | null = null;

export async function getAccessControl(): Promise<AccessControlDoc> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.doc;
  }

  const db = await getDb();
  const raw = await db.collection(COLLECTION).findOne<AccessControlDoc>({});

  let doc: AccessControlDoc;
  if (!raw) {
    doc = { allowAll: false, allowedEmails: [], adminEmails: [DEFAULT_ADMIN] };
    await db.collection(COLLECTION).insertOne({ ...doc });
  } else {
    doc = { allowAll: raw.allowAll, allowedEmails: raw.allowedEmails, adminEmails: raw.adminEmails };
  }

  cache = { doc, expiresAt: Date.now() + 30_000 };
  return doc;
}

export async function updateAccessControl(patch: Partial<AccessControlDoc>): Promise<AccessControlDoc> {
  const current = await getAccessControl();
  const updated: AccessControlDoc = {
    allowAll: patch.allowAll ?? current.allowAll,
    allowedEmails: patch.allowedEmails ?? current.allowedEmails,
    adminEmails: patch.adminEmails ?? current.adminEmails,
  };

  const db = await getDb();
  await db.collection(COLLECTION).replaceOne({}, updated, { upsert: true });

  cache = null; // invalidate
  return updated;
}

export async function isAdmin(email: string): Promise<boolean> {
  const doc = await getAccessControl();
  return doc.adminEmails.includes(email);
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit
```

Expected: no errors (or only pre-existing errors unrelated to this file).

- [ ] **Step 3: Commit**

```bash
git add lib/access-control.ts
git commit -m "feat: add access-control MongoDB helper with in-memory cache"
```

---

## Task 2: Update `lib/auth.ts`

**Files:**
- Modify: `lib/auth.ts`

- [ ] **Step 1: Replace the env-based signIn callback**

Open `lib/auth.ts`. Replace the entire `signIn` callback:

```typescript
// Before
async signIn({ user }) {
  const allowed = process.env.ALLOWED_EMAILS?.split(",").map((e) => e.trim()).filter(Boolean) ?? [];
  return allowed.includes(user.email ?? "");
},
```

With:

```typescript
// After
async signIn({ user }) {
  const { getAccessControl } = await import('./access-control');
  const { allowAll, allowedEmails } = await getAccessControl();
  if (allowAll) return true;
  return allowedEmails.includes(user.email ?? '');
},
```

> Note: Dynamic `import()` is used here to avoid a circular-module issue if `lib/auth.ts` is ever imported in a non-server context. The `server-only` guard inside `access-control.ts` still enforces server-only usage at build time.

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit
```

Expected: no errors related to these files.

- [ ] **Step 3: Commit**

```bash
git add lib/auth.ts
git commit -m "feat: read sign-in allowlist from MongoDB instead of ALLOWED_EMAILS env"
```

---

## Task 3: Create `app/api/access-control/route.ts`

**Files:**
- Create: `app/api/access-control/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAccessControl, updateAccessControl, isAdmin, type AccessControlDoc } from '@/lib/access-control';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(session.user.email))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const doc = await getAccessControl();
    return NextResponse.json(doc);
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

    const body = (await req.json()) as Partial<AccessControlDoc>;

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const updated = await updateAccessControl(body);
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify the route responds correctly with the dev server**

Start the dev server (`npm run dev`), then sign in as `btechy4@gmail.com` and in a browser DevTools console run:

```js
// Should return the access control doc
fetch('/api/access-control').then(r => r.json()).then(console.log)
```

Expected: `{ allowAll: false, allowedEmails: [], adminEmails: ["btechy4@gmail.com"] }`

Sign in as a non-admin email and repeat — expected: `403 Forbidden`.

- [ ] **Step 4: Commit**

```bash
git add app/api/access-control/route.ts
git commit -m "feat: add GET/PUT /api/access-control route with admin guard"
```

---

## Task 4: Create `components/settings/access-control-settings.tsx`

**Files:**
- Create: `components/settings/access-control-settings.tsx`

- [ ] **Step 1: Create the client component**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { AccessControlDoc } from '@/lib/access-control';

interface Props {
  initialData: AccessControlDoc;
  currentUserEmail: string;
}

export function AccessControlSettings({ initialData, currentUserEmail }: Props) {
  const [data, setData] = useState<AccessControlDoc>(initialData);
  const [allowedInput, setAllowedInput] = useState('');
  const [adminInput, setAdminInput] = useState('');
  const [isPending, startTransition] = useTransition();

  async function save(patch: Partial<AccessControlDoc>) {
    const next: AccessControlDoc = {
      allowAll: patch.allowAll ?? data.allowAll,
      allowedEmails: patch.allowedEmails ?? data.allowedEmails,
      adminEmails: patch.adminEmails ?? data.adminEmails,
    };
    const res = await fetch('/api/access-control', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    if (res.ok) {
      const updated: AccessControlDoc = await res.json();
      setData(updated);
    }
  }

  function addAllowed() {
    const email = allowedInput.trim().toLowerCase();
    if (!email || data.allowedEmails.includes(email)) return;
    startTransition(async () => {
      await save({ allowedEmails: [...data.allowedEmails, email] });
      setAllowedInput('');
    });
  }

  function removeAllowed(email: string) {
    startTransition(() => save({ allowedEmails: data.allowedEmails.filter((e) => e !== email) }));
  }

  function addAdmin() {
    const email = adminInput.trim().toLowerCase();
    if (!email || data.adminEmails.includes(email)) return;
    startTransition(async () => {
      await save({ adminEmails: [...data.adminEmails, email] });
      setAdminInput('');
    });
  }

  function removeAdmin(email: string) {
    if (email === currentUserEmail) {
      if (!confirm("You'll lose access to this settings tab — are you sure?")) return;
    }
    startTransition(() => save({ adminEmails: data.adminEmails.filter((e) => e !== email) }));
  }

  return (
    <div className="flex flex-col gap-8 max-w-lg">
      {/* Allow All */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Sign-in Access</h2>
        <div className="flex items-center gap-3">
          <Switch
            id="allow-all"
            checked={data.allowAll}
            onCheckedChange={(checked) => startTransition(() => save({ allowAll: checked }))}
            disabled={isPending}
          />
          <Label htmlFor="allow-all">Allow all Google accounts</Label>
        </div>
        {data.allowAll && (
          <p className="text-sm text-amber-600">Warning: any Google account can sign in.</p>
        )}
      </div>

      {/* Allowed Emails */}
      <div className="flex flex-col gap-3">
        <h2 className={`text-sm font-semibold ${data.allowAll ? 'text-muted-foreground' : ''}`}>
          Allowed Emails{data.allowAll ? ' (inactive — Allow All is on)' : ''}
        </h2>
        <div className="flex flex-col gap-1">
          {data.allowedEmails.length === 0 && (
            <p className="text-xs text-muted-foreground">No emails added.</p>
          )}
          {data.allowedEmails.map((email) => (
            <div key={email} className="flex items-center justify-between py-1 px-2 rounded bg-muted text-sm">
              <span>{email}</span>
              <button
                onClick={() => removeAllowed(email)}
                disabled={isPending || data.allowAll}
                className="text-muted-foreground hover:text-destructive disabled:opacity-40 ml-2"
                aria-label={`Remove ${email}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="email@example.com"
            value={allowedInput}
            onChange={(e) => setAllowedInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAllowed()}
            disabled={isPending || data.allowAll}
          />
          <Button variant="outline" onClick={addAllowed} disabled={isPending || data.allowAll}>
            Add
          </Button>
        </div>
      </div>

      {/* Admin Emails */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Admin Emails</h2>
        <p className="text-xs text-muted-foreground">These emails can view and manage this Access tab.</p>
        <div className="flex flex-col gap-1">
          {data.adminEmails.map((email) => (
            <div key={email} className="flex items-center justify-between py-1 px-2 rounded bg-muted text-sm">
              <span>
                {email}
                {email === currentUserEmail && (
                  <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                )}
              </span>
              <button
                onClick={() => removeAdmin(email)}
                disabled={isPending}
                className="text-muted-foreground hover:text-destructive disabled:opacity-40 ml-2"
                aria-label={`Remove ${email}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="email@example.com"
            value={adminInput}
            onChange={(e) => setAdminInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAdmin()}
            disabled={isPending}
          />
          <Button variant="outline" onClick={addAdmin} disabled={isPending}>
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/settings/access-control-settings.tsx
git commit -m "feat: add AccessControlSettings client component"
```

---

## Task 5: Update `app/(app)/settings/page.tsx`

**Files:**
- Modify: `app/(app)/settings/page.tsx`

- [ ] **Step 1: Replace the entire file content**

```tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAccessControl } from '@/lib/access-control';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StageSubscriptionSettings } from '@/components/notifications/stage-subscription-settings';
import { AccessControlSettings } from '@/components/settings/access-control-settings';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const accessControl = await getAccessControl();
  const showAccessTab =
    !!session?.user?.email && accessControl.adminEmails.includes(session.user.email);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Tabs defaultValue="notifications">
        <TabsList>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          {showAccessTab && <TabsTrigger value="access">Access</TabsTrigger>}
        </TabsList>
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
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles and build succeeds**

```bash
cd e:/projects/sheet-admin && npx tsc --noEmit && npm run build
```

Expected: clean build, no type errors.

- [ ] **Step 3: End-to-end manual smoke test**

Start the dev server (`npm run dev`) and verify:

1. Sign in as `btechy4@gmail.com` → Settings page shows **"Access"** tab.
2. Click Access tab → see Allow All toggle (off), empty Allowed Emails list, Admin Emails list containing `btechy4@gmail.com`.
3. Add an email to Allowed Emails (e.g. `test@example.com`) → appears in list immediately.
4. Remove it → disappears.
5. Toggle Allow All on → Allowed Emails section shows greyed out + amber warning.
6. Toggle Allow All off → section returns to normal.
7. Add a second email to Admin Emails → appears.
8. Sign in as a non-admin email (e.g. one not in `adminEmails`) → Settings page shows **no** Access tab.

- [ ] **Step 4: Commit**

```bash
git add app/(app)/settings/page.tsx
git commit -m "feat: add Access tab in Settings for admin email management"
```

---

## Task 6: Cleanup — remove `ALLOWED_EMAILS` from env docs

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Remove the `ALLOWED_EMAILS` env var entry from CLAUDE.md**

Open `CLAUDE.md`. In the **Environment Variables** section, remove this line:
```
ALLOWED_EMAILS=email1@x.com,email2@x.com   # Comma-separated allowlist
```

And in the **Gotchas** section, remove the **Auth allowlist** bullet:
```
- **Auth allowlist**: `ALLOWED_EMAILS` is checked in the `signIn` callback; missing or empty = nobody can log in.
```

Add a new Gotcha entry in its place:
```
- **Auth allowlist**: Stored in the `accesscontrol` MongoDB collection (single document). On first sign-in attempt, auto-seeded with `adminEmails: ["btechy4@gmail.com"]`. Use the Access tab in Settings (admin-only) to manage allowed emails and admins.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md — replace ALLOWED_EMAILS env with MongoDB access control"
```
