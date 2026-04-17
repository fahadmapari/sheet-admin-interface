# Shareable Links — Design Spec

**Date:** 2026-04-17
**Status:** Approved

## Overview

Allow authenticated users to generate public shareable links to a filtered, column-constrained view of product data. Visitors open the link without signing in and see a live, read-only table scoped to what was configured at creation time.

---

## Data Model

New MongoDB collection: `shareablelinks`

```ts
interface ShareableLink {
  _id: ObjectId;
  token: string;          // nanoid(12) — URL key: /share/<token>
  title: string;
  createdBy: string;      // email of creator
  createdAt: Date;
  expiresAt: Date | null; // null = never expires
  visibleToTeam: boolean; // if false, hidden from Team Links tab
  columns: string[];      // array of TourProduct field keys to display
  filters: Filters;       // serialized Filters object (lib/product-filters.ts)
}
```

`token` is a short random string (not the Mongo `_id`) so URLs are clean and non-guessable. No sensitive data is embedded in the token itself.

---

## API Routes

All three routes require an active session:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/shareables` | Create a new shareable link |
| `GET` | `/api/shareables?scope=mine\|team` | List links for current user or team |
| `DELETE` | `/api/shareables/[id]` | Revoke a link by MongoDB `_id` (creator only) |

The public share page (`/share/[token]`) is a server component that reads MongoDB and Google Sheets directly — no separate public API endpoint is needed.

### POST /api/shareables

Request body:
```ts
{
  title: string;
  expiresAt: string | null; // ISO date string or null
  visibleToTeam: boolean;
  columns: string[];
  filters: Filters;
}
```

Response: `{ token: string }` — the token used to construct the share URL.

### GET /api/shareables

Query param `scope`:
- `mine` — links where `createdBy` matches session email
- `team` — links where `visibleToTeam: true` and `createdBy` does not match session email

Response: `ShareableLink[]` (without sensitive internals, with `_id` as string).

### DELETE /api/shareables/[id]

Only the creator can delete. Returns `403` if session email doesn't match `createdBy`.

---

## Routing & Middleware

A `middleware.ts` is created at the project root. It protects all routes by default, with explicit bypasses for:
- `/login`
- `/api/auth/**`
- `/_next/**`
- `/share/**` ← new bypass for public share pages

**New route:**
```
app/
  share/
    [token]/
      page.tsx    ← server component, outside (app) and (auth) groups
```

Being outside both route groups means it inherits no auth layout. Combined with the middleware bypass, it is fully public.

---

## UI Components

### Export Button Extension

A new `DropdownMenuItem` — "Create Shareable Link" — added at the bottom of the existing Export dropdown in `components/products/export-button.tsx`. Clicking it opens `CreateShareableLinkDialog`.

### CreateShareableLinkDialog

A modal dialog with the following sections:

1. **Title** — required text input
2. **Expiry** — button group: `7 days` / `30 days` / `90 days` / `1 year` / `Never`
3. **Visible to team** — toggle switch; when on, the link appears in teammates' "Team Links" tab
4. **Columns** — checklist grouped by column groups (matching the table's column group config), pre-checked with the current `columnVisibility` state. At least one column must remain selected.
5. **Active filters** — read-only summary (e.g. "Country: France · Status: Active"). Shows "All products" when no filters are active.
6. **Create button** — calls `POST /api/shareables`. On success, transitions to a success state showing the full share URL with a one-click copy button.

Props passed in from `ExportButton`: `columnVisibility`, `filters`, `products` (used only for count display).

> **Wiring note:** `ExportButton` currently accepts only `products` and `columnVisibility`. It needs a new `filters` prop added so it can pass the active filter state into the dialog. `products-client.tsx` already holds the `filters` state and passes it to `ExportButton`.

### Shareables Page

Replaces the "Coming Soon" placeholder in `app/(app)/shareables/page.tsx`.

- Two tabs: **My Links** and **Team Links**
- Each tab renders a list/table of links with columns: Title, Created, Expiry, Columns (count), and actions
- **My Links** actions: Copy link, Delete (with confirmation)
- **Team Links** actions: Copy link only
- Expired links shown with muted text and an "Expired" badge
- Empty state message when no links exist

### Public Share Page (`/share/[token]`)

Minimal layout — no sidebar, no nav bar, no auth UI. Just:

- Page `<title>` and an `<h1>` from `link.title`
- A "Powered by [app name]" subtle footer (optional branding)
- A read-only `ProductTable` variant (`ShareableProductTable`) rendering only the stored `columns`
- Search input and column sorting enabled
- No filter bar, no edit/delete row actions, no bulk selection
- If the token is not found or the link is expired: renders a centered "This link is no longer available" message with no data

---

## Data Flow — Public Page

1. Server component receives `token` from URL params
2. Looks up `shareablelinks` collection in MongoDB by `token`
3. Checks expiry: if `expiresAt` is set and in the past, render expired state
4. Fetches all rows from Google Sheets via the **service account** (no user OAuth needed)
5. Applies `link.filters` using the same matching functions from `lib/product-filters.ts`
6. Passes filtered products + `link.columns` to `ShareableProductTable`
7. Visitor cannot modify filters or see columns outside what was configured

---

## Filter Application

The stored `Filters` object is applied server-side using the existing filter matching utilities from `lib/product-filters.ts` (`matchesMultiFilter`, `matchesPresenceFilter`, `matchesTriStateFilter`). The visitor sees only the rows that matched the filter criteria at the time of creation — they cannot expand or change the filter scope.

---

## Expiry

Expiry options in the creation modal:

| Label | Value |
|-------|-------|
| 7 days | `createdAt + 7d` |
| 30 days | `createdAt + 30d` |
| 90 days | `createdAt + 90d` |
| 1 year | `createdAt + 365d` |
| Never | `null` |

Expiry is checked at page render time. No background job is needed — expired links simply render the "no longer available" state. Creators can manually delete links at any time from the Shareables page.

---

## Security Considerations

- Tokens are 12-character nanoids (random, non-guessable — ~72 bits of entropy)
- No user data or filter config is embedded in the token
- Expired links return a neutral message with no data
- The service account is read-only for sheet access on public pages
- No write operations are possible from the public share page
