# Assembly Notification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-app notification system where users self-subscribe to assembly stages and receive a bell-icon feed + Sonner toast when a batch moves to a watched stage.

**Architecture:** Two new MongoDB collections (`notification_subscriptions`, `notifications`) store subscriptions and events. The existing `POST /api/assembly/move` route fans out notification docs after each move. A `NotificationBell` component polls `GET /api/notifications` every 30 seconds via SWR, fires Sonner toasts for newly arrived items, and opens a dropdown with a "Mark all as read" action. Subscription preferences live in a `StageSubscriptionSettings` component surfaced in the header user menu.

**Tech Stack:** Next.js 14 App Router, TypeScript, MongoDB (`mongodb` driver), NextAuth (`getServerSession`), SWR, Sonner, Radix UI Popover/Switch, Lucide icons, date-fns

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `lib/types.ts` | Add `AppNotification` and `NotificationSubscription` types |
| Create | `lib/notifications.ts` | Server-only helper: `fanOutNotifications()` |
| Create | `app/api/notifications/route.ts` | `GET /api/notifications` |
| Create | `app/api/notifications/mark-read/route.ts` | `POST /api/notifications/mark-read` |
| Create | `app/api/notifications/subscriptions/route.ts` | `GET` + `PUT /api/notifications/subscriptions` |
| Modify | `app/api/assembly/move/route.ts` | Call `fanOutNotifications` after move |
| Create | `components/notifications/notification-dropdown.tsx` | Notification list UI |
| Create | `components/notifications/stage-subscription-settings.tsx` | Stage toggle UI |
| Create | `components/notifications/notification-bell.tsx` | Bell icon + popover + SWR polling + toast |
| Modify | `components/layout/header.tsx` | Replace static bell, add subscription settings to user menu |

---

## Task 1: Add types to `lib/types.ts`

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add the two new types at the end of `lib/types.ts`**

Append after the last line of `lib/types.ts`:

```ts
export interface AppNotification {
  _id: string;
  recipientEmail: string;
  batchId: string;
  batchName: string;
  productCount: number;
  stage: AssemblyStage;
  createdAt: string; // ISO string
  read: boolean;
}

export interface NotificationSubscription {
  email: string;
  stages: AssemblyStage[];
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add AppNotification and NotificationSubscription types"
```

---

## Task 2: Create server-side notification helper

**Files:**
- Create: `lib/notifications.ts`

- [ ] **Step 1: Create `lib/notifications.ts`**

```ts
import 'server-only';
import { getDb } from '@/lib/mongodb';
import type { AssemblyStage } from '@/lib/types';

export async function fanOutNotifications({
  batchId,
  batchName,
  productCount,
  targetStage,
  actorEmail,
}: {
  batchId: string;
  batchName: string;
  productCount: number;
  targetStage: AssemblyStage;
  actorEmail: string;
}): Promise<void> {
  const db = await getDb();

  const subscribers = await db
    .collection('notification_subscriptions')
    .find({ stages: targetStage, email: { $ne: actorEmail } })
    .toArray();

  if (subscribers.length === 0) return;

  const docs = subscribers.map((sub) => ({
    recipientEmail: sub.email as string,
    batchId,
    batchName,
    productCount,
    stage: targetStage,
    createdAt: new Date(),
    read: false,
  }));

  await db.collection('notifications').insertMany(docs);
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/notifications.ts
git commit -m "feat: add fanOutNotifications server helper"
```

---

## Task 3: Subscriptions API route

**Files:**
- Create: `app/api/notifications/subscriptions/route.ts`

- [ ] **Step 1: Create the file**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { ASSEMBLY_STAGES, type AssemblyStage } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  const sub = await db
    .collection('notification_subscriptions')
    .findOne({ email: session.user.email });

  return NextResponse.json({ stages: (sub?.stages ?? []) as AssemblyStage[] });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as { stages: AssemblyStage[] };

  if (
    !Array.isArray(body.stages) ||
    body.stages.some((s) => !ASSEMBLY_STAGES.includes(s))
  ) {
    return NextResponse.json({ error: 'Invalid stages' }, { status: 400 });
  }

  const db = await getDb();
  await db.collection('notification_subscriptions').updateOne(
    { email: session.user.email },
    { $set: { email: session.user.email, stages: body.stages } },
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/notifications/subscriptions/route.ts
git commit -m "feat: add GET/PUT /api/notifications/subscriptions"
```

---

## Task 4: Notifications fetch API route

**Files:**
- Create: `app/api/notifications/route.ts`

- [ ] **Step 1: Create the file**

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  const raw = await db
    .collection('notifications')
    .find({ recipientEmail: session.user.email })
    .sort({ read: 1, createdAt: -1 })
    .limit(50)
    .toArray();

  const notifications = raw.map((n) => ({
    ...n,
    _id: n._id.toString(),
    createdAt:
      n.createdAt instanceof Date ? n.createdAt.toISOString() : (n.createdAt as string),
  }));

  return NextResponse.json({ notifications });
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/notifications/route.ts
git commit -m "feat: add GET /api/notifications"
```

---

## Task 5: Mark-read API route

**Files:**
- Create: `app/api/notifications/mark-read/route.ts`

- [ ] **Step 1: Create the file**

```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  await db
    .collection('notifications')
    .updateMany(
      { recipientEmail: session.user.email, read: false },
      { $set: { read: true } },
    );

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/notifications/mark-read/route.ts
git commit -m "feat: add POST /api/notifications/mark-read"
```

---

## Task 6: Extend `POST /api/assembly/move` with notification fan-out

**Files:**
- Modify: `app/api/assembly/move/route.ts`

- [ ] **Step 1: Add `getServerSession` import and `fanOutNotifications` import**

At the top of `app/api/assembly/move/route.ts`, add to the existing imports:

```ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fanOutNotifications } from '@/lib/notifications';
```

- [ ] **Step 2: Resolve actor email from session at start of POST handler**

Inside the `POST` function, after `const body = (await req.json()) as MoveBody;`, add:

```ts
const session = await getServerSession(authOptions);
const actorEmail = session?.user?.email ?? '';
```

- [ ] **Step 3: Call `fanOutNotifications` after the sheet sync block**

After the `if (targetStage === 'Ready for Upload')` block (around line 87) and before `return NextResponse.json(...)`, add:

```ts
// Fan out notifications (fire-and-forget — failure must not block the move)
try {
  const movedBatch = await col.findOne({ _id: targetBatchId });
  await fanOutNotifications({
    batchId: targetBatchId.toString(),
    batchName: movedBatch?.name ?? '',
    productCount: rowIndexes.length,
    targetStage,
    actorEmail,
  });
} catch (err) {
  console.warn('[assembly/move] Notification fan-out failed:', err);
}
```

- [ ] **Step 4: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/assembly/move/route.ts
git commit -m "feat: fan out notifications on batch stage move"
```

---

## Task 7: `NotificationDropdown` component

**Files:**
- Create: `components/notifications/notification-dropdown.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client';

import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppNotification } from '@/lib/types';

interface NotificationDropdownProps {
  notifications: AppNotification[];
  isLoading: boolean;
  onMarkAllRead: () => void;
}

export function NotificationDropdown({
  notifications,
  isLoading,
  onMarkAllRead,
}: NotificationDropdownProps) {
  return (
    <div className="w-[380px]">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-3 py-2">
        <span className="text-sm font-medium">Notifications</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onMarkAllRead}
          disabled={notifications.every((n) => n.read)}
        >
          Mark all as read
        </Button>
      </div>
      <ScrollArea className="max-h-[400px]">
        {isLoading ? (
          <div className="space-y-1 p-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-[hsl(var(--text-secondary))]">
            No notifications yet
          </div>
        ) : (
          <div className="p-1">
            {notifications.map((n) => (
              <div
                key={n._id}
                className={`rounded-md px-3 py-2.5 text-sm ${
                  !n.read ? 'bg-[hsl(var(--surface))]' : ''
                }`}
              >
                <p className="font-medium text-[hsl(var(--text-primary))]">
                  Batch &ldquo;{n.batchName}&rdquo; ({n.productCount} product
                  {n.productCount !== 1 ? 's' : ''}) moved to {n.stage}
                </p>
                <p className="mt-0.5 text-xs text-[hsl(var(--text-secondary))]">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/notifications/notification-dropdown.tsx
git commit -m "feat: add NotificationDropdown component"
```

---

## Task 8: `StageSubscriptionSettings` component

**Files:**
- Create: `components/notifications/stage-subscription-settings.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client';

import useSWR from 'swr';
import { ASSEMBLY_STAGES, type AssemblyStage } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { fetcher } from '@/lib/fetcher';

export function StageSubscriptionSettings() {
  const { data, mutate } = useSWR<{ stages: AssemblyStage[] }>(
    '/api/notifications/subscriptions',
    fetcher,
  );

  const subscribedStages = data?.stages ?? [];

  const handleToggle = async (stage: AssemblyStage, checked: boolean) => {
    const next = checked
      ? [...subscribedStages, stage]
      : subscribedStages.filter((s) => s !== stage);

    await mutate(
      async () => {
        await fetch('/api/notifications/subscriptions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stages: next }),
        });
        return { stages: next };
      },
      { optimisticData: { stages: next }, rollbackOnError: true },
    );
  };

  return (
    <div className="space-y-1 px-1 py-1">
      <p className="px-2 pb-1 text-xs font-medium text-[hsl(var(--text-secondary))]">
        Notify me when a batch reaches
      </p>
      {ASSEMBLY_STAGES.map((stage) => (
        <div
          key={stage}
          className="flex items-center justify-between rounded-md px-2 py-1.5"
        >
          <Label
            htmlFor={`stage-sub-${stage}`}
            className="cursor-pointer text-sm font-normal"
          >
            {stage}
          </Label>
          <Switch
            id={`stage-sub-${stage}`}
            checked={subscribedStages.includes(stage)}
            onCheckedChange={(checked) => handleToggle(stage, checked)}
          />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/notifications/stage-subscription-settings.tsx
git commit -m "feat: add StageSubscriptionSettings component"
```

---

## Task 9: `NotificationBell` component

**Files:**
- Create: `components/notifications/notification-bell.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client';

import { useEffect, useRef } from 'react';
import useSWR from 'swr';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { NotificationDropdown } from '@/components/notifications/notification-dropdown';
import { fetcher } from '@/lib/fetcher';
import type { AppNotification } from '@/lib/types';

export function NotificationBell() {
  const { data, isLoading, mutate } = useSWR<{ notifications: AppNotification[] }>(
    '/api/notifications',
    fetcher,
    { refreshInterval: 30_000 },
  );

  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Track IDs seen in the previous poll to detect newly arrived notifications
  const prevIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(notifications.map((n) => n._id));

    if (prevIdsRef.current.size > 0) {
      for (const n of notifications) {
        if (!prevIdsRef.current.has(n._id) && !n.read) {
          toast.info(
            `Batch "${n.batchName}" (${n.productCount} product${
              n.productCount !== 1 ? 's' : ''
            }) moved to ${n.stage}`,
          );
        }
      }
    }

    prevIdsRef.current = currentIds;
  }, [notifications]);

  const handleMarkAllRead = async () => {
    await fetch('/api/notifications/mark-read', { method: 'POST' });
    await mutate();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="h-4 w-4" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="p-0">
        <NotificationDropdown
          notifications={notifications}
          isLoading={isLoading}
          onMarkAllRead={handleMarkAllRead}
        />
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/notifications/notification-bell.tsx
git commit -m "feat: add NotificationBell component with SWR polling and toast"
```

---

## Task 10: Wire everything into the Header

**Files:**
- Modify: `components/layout/header.tsx`

- [ ] **Step 1: Replace the static bell and add subscription settings**

Replace the full contents of `components/layout/header.tsx` with:

```tsx
'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Menu } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MobileSidebar } from '@/components/layout/sidebar';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { StageSubscriptionSettings } from '@/components/notifications/stage-subscription-settings';

function formatSegment(segment: string) {
  if (/^\d+$/.test(segment)) return `Row ${segment}`;
  return segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const segments = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);

    if (parts.length === 0) {
      return [{ label: 'Dashboard', href: '/' }];
    }

    return parts.map((part, index) => ({
      label: formatSegment(part),
      href: `/${parts.slice(0, index + 1).join('/')}`,
    }));
  }, [pathname]);

  const userName = session?.user?.name ?? 'User';
  const userEmail = session?.user?.email ?? '';
  const userImage = session?.user?.image ?? undefined;
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-[var(--z-header)] flex h-12 items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background)_/_0.8)] px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="md:hidden">
          <MobileSidebar>
            <Button variant="ghost" size="icon" aria-label="Open navigation">
              <Menu className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </MobileSidebar>
        </div>
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            {segments.map((segment, index) => (
              <LinkFragment key={segment.href}>
                <BreadcrumbItem>
                  {index === segments.length - 1 ? (
                    <BreadcrumbPage>{segment.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={segment.href}>{segment.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {index < segments.length - 1 && <BreadcrumbSeparator />}
              </LinkFragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="overflow-hidden rounded-full">
              <Avatar className="h-7 w-7">
                <AvatarImage src={userImage} alt={userName} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="space-y-0.5">
              <div className="text-sm font-medium text-[hsl(var(--text-primary))]">
                {userName}
              </div>
              <div className="text-xs text-[hsl(var(--text-secondary))]">{userEmail}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <StageSubscriptionSettings />
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Profile</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function LinkFragment({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start dev server and manually verify**

```bash
npm run dev
```

Open `http://localhost:3000`:
- Bell icon shows in header (replacing the static one)
- Clicking bell opens dropdown with "No notifications yet" or skeleton
- Clicking the avatar opens user menu showing real name/email and stage toggles
- Toggling a stage switch and re-opening the menu shows the persisted state (network request to `PUT /api/notifications/subscriptions` visible in DevTools)
- Moving a batch on the assembly page (while subscribed to its target stage from a second account) produces a notification doc in MongoDB and appears in the bell within 30 seconds

- [ ] **Step 4: Commit**

```bash
git add components/layout/header.tsx
git commit -m "feat: wire NotificationBell and StageSubscriptionSettings into Header"
```

---

## Post-implementation: MongoDB indexes

After the app is verified working, create the recommended indexes to keep queries fast as data grows. Run these once against your MongoDB instance (e.g. via MongoDB Compass shell or `mongosh`):

```js
// notification_subscriptions: unique lookup by email
db.notification_subscriptions.createIndex({ email: 1 }, { unique: true })

// notifications: main query path
db.notifications.createIndex({ recipientEmail: 1, read: 1, createdAt: -1 })

// TTL: auto-delete read notifications after 30 days
db.notifications.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 2592000, partialFilterExpression: { read: true } }
)
```
