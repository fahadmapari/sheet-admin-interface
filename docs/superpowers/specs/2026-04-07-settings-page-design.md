# Settings Page — Design Spec

**Date:** 2026-04-07  
**Status:** Approved

---

## Overview

Move the notification subscription settings (`StageSubscriptionSettings`) from the account avatar dropdown in the header to a dedicated `/settings` page. The settings page uses a tabbed layout (Shadcn `Tabs`) to accommodate future settings categories while keeping the current scope minimal.

---

## Motivation

The account dropdown is the wrong home for subscription settings — it's a transient menu, not a settings surface. A dedicated page is easier to discover, easier to use, and provides room to grow.

---

## Changes

### New: `app/(app)/settings/page.tsx`

A server component. No data fetching at the page level — `StageSubscriptionSettings` manages its own SWR fetch.

Layout:
- Page heading: "Settings"
- Shadcn `Tabs` with `defaultValue="notifications"`
- `TabsList` with one `TabsTrigger` value `"notifications"` labelled "Notifications"
- `TabsContent` for `"notifications"` renders `<StageSubscriptionSettings />`

Styling follows the existing page patterns in the app (e.g. `app/(app)/products/page.tsx`).

---

### Modified: `components/layout/header.tsx`

- Remove `<StageSubscriptionSettings />` from the avatar `DropdownMenuContent`
- Remove the `<DropdownMenuSeparator />` that surrounded it
- Remove the `StageSubscriptionSettings` import
- Keep the "Settings" `DropdownMenuItem` linking to `/settings` — this is the natural entry point

---

### `components/notifications/stage-subscription-settings.tsx`

No logic changes. The root div currently has `px-1 py-1` padding suited for a dropdown context — adjust to `p-0` or remove so it fits naturally in a page card/section layout.

---

## Out of Scope

- Additional settings tabs (Profile, Appearance, etc.)
- URL-based tab routing
- Any changes to the subscriptions API
