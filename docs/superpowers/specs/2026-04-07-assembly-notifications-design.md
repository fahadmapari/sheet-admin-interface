# Assembly Line Notification System — Design Spec

**Date:** 2026-04-07  
**Status:** Approved

---

## Overview

Add an in-app notification system to the assembly line. When a batch moves to a stage, every user who has subscribed to that stage receives a persistent notification (bell icon + dropdown) and an immediate Sonner toast. Users self-manage which stages they watch via a toggle UI.

---

## Approach

MongoDB-backed, server-side storage. Two new collections in the existing `sheet-admin` database. The `POST /api/assembly/move` route is extended to fan out notifications after each successful move. The bell icon polls via SWR every 30 seconds.

---

## Data Model

### Collection: `notification_subscriptions`

One document per user. Upserted on save.

```ts
{
  _id: ObjectId,
  email: string,          // matches NextAuth session user.email
  stages: AssemblyStage[] // e.g. ["Buying Price", "Selling Price"]
}
```

Index: `{ email: 1 }` (unique)

---

### Collection: `notifications`

One document per recipient per batch move event.

```ts
{
  _id: ObjectId,
  recipientEmail: string,
  batchId: string,
  batchName: string,
  productCount: number,
  stage: AssemblyStage,
  createdAt: Date,
  read: boolean           // set to false on insert; true after "Mark all as read"
}
```

Index: `{ recipientEmail: 1, read: 1, createdAt: -1 }`  
TTL index: `{ createdAt: 1 }` with `expireAfterSeconds: 2592000` (30 days, read docs only — filtered via partial index on `read: true`)

---

## API Endpoints

### `GET /api/notifications`

Returns the calling user's notifications, unread first, capped at 50.

**Response:**
```ts
{ notifications: Notification[] }
```

Auth: NextAuth session required. Returns 401 if unauthenticated.

---

### `POST /api/notifications/mark-read`

Marks all notifications as read for the calling user.

**Response:** `{ ok: true }`

---

### `GET /api/notifications/subscriptions`

Returns the calling user's subscribed stages.

**Response:** `{ stages: AssemblyStage[] }`

Returns `{ stages: [] }` if no subscription document exists yet.

---

### `PUT /api/notifications/subscriptions`

Upserts the calling user's subscription.

**Body:** `{ stages: AssemblyStage[] }`  
**Response:** `{ ok: true }`

---

### Modified: `POST /api/assembly/move`

After a successful batch move, the route:
1. Queries `notification_subscriptions` for all users with `targetStage` in their `stages` array
2. Bulk-inserts one `notifications` doc per matching user (excluding the user who triggered the move — they already know)
3. Failure is fire-and-forget: logs a `console.warn` but does not fail the move response

---

## UI Components

### `NotificationBell` (`components/notifications/notification-bell.tsx`)

- Rendered inside the existing `Header` component
- Bell icon (Lucide `Bell`) with a red badge showing unread count (hidden when 0)
- Opens `NotificationDropdown` inside a Radix `Popover`
- Polls `GET /api/notifications` via SWR every 30 seconds
- On each poll, compares previous result to current; fires a Sonner toast for each newly arrived notification: `"Batch '{name}' ({n} products) moved to {stage}"`

---

### `NotificationDropdown` (`components/notifications/notification-dropdown.tsx`)

- Radix `Popover` content, ~380px wide
- Header row: "Notifications" title + "Mark all as read" button (calls `POST /api/notifications/mark-read`, then mutates SWR cache)
- Body: Radix `ScrollArea`, max-height 400px
- Each row: batch name, product count, stage, relative time (e.g. "3 minutes ago")
- Unread rows have a subtle highlight (existing surface token)
- Empty state: "No notifications yet"
- Skeleton placeholders (3 rows) while loading

---

### `StageSubscriptionSettings` (`components/notifications/stage-subscription-settings.tsx`)

- A list of all 6 `ASSEMBLY_STAGES` each with a Radix `Switch`
- Fetches current subscriptions via `GET /api/notifications/subscriptions` on mount
- On toggle: immediately calls `PUT /api/notifications/subscriptions` with the updated stages array
- Displayed inside a "Notification preferences" section in the user dropdown menu (existing header avatar/dropdown)

---

## Error Handling

- All new API routes return 401 for unauthenticated requests
- `PUT /api/notifications/subscriptions` validates that all submitted stages are members of `ASSEMBLY_STAGES`; returns 400 on invalid input
- SWR fetch errors in the bell component are silent (no error UI — bell simply shows stale count)
- Notification fan-out failure in `assembly/move` is logged but does not affect the move response

---

## Out of Scope

- Email notifications
- Per-notification dismiss (only "Mark all as read")
- Notification preferences per-batch (only per-stage)
- Real-time push (SSE/WebSockets)
