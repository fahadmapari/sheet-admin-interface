# Sheet Storage — Design Spec
Date: 2026-04-20

## Overview

A new "Sheet Storage" page where users can save and manage Google Sheet / Google Docs URLs with a name, optional tags, and an optional team-visibility flag. Supports full CRUD, search across name/URL/tags, and tag-click filtering. Follows the same patterns as the existing Shareables page.

---

## Data Model

**MongoDB collection:** `sheetlinks`

```ts
interface SheetLink {
  _id: string;
  name: string;          // user-given display name
  url: string;           // the Google Sheet or Docs URL
  tags: string[];        // free-form, may be empty
  visibleToTeam: boolean;
  createdBy: string;     // email of the creator
  createdAt: string;     // ISO string
  updatedAt: string;     // ISO string
}
```

- No expiry field (unlike ShareableLink).
- Only the owner (`createdBy === session.user.email`) may edit or delete a link.
- Team members see links where `visibleToTeam: true` and `createdBy !== their email`.

TypeScript interface `SheetLink` added to `lib/types.ts`.

---

## Backend

### `lib/sheet-links.ts`

Server-only module. Functions:

| Function | Description |
|---|---|
| `createSheetLink(input)` | Insert a new document, return the created `SheetLink` |
| `listSheetLinksMine(email, query?)` | Owned by email; regex filter on name/url/tags if query provided |
| `listSheetLinksTeam(email, query?)` | `visibleToTeam: true`, not owned by email; same search |
| `updateSheetLink(id, email, patch)` | Patch name/url/tags/visibleToTeam; 404/403 guards |
| `deleteSheetLink(id, email)` | Owner-only delete; returns `'deleted' | 'not_found' | 'forbidden'` |

### API Routes

**`app/api/sheet-links/route.ts`**
- `GET ?scope=mine|team&q=<query>` — list links, optional search
- `POST` — create; requires `name` (non-empty) and `url` (non-empty)

**`app/api/sheet-links/[id]/route.ts`**
- `PATCH` — edit name, url, tags, visibleToTeam (owner only)
- `DELETE` — remove (owner only)

Auth guard on all routes: 401 if no session.

---

## Frontend

### Page

`app/(app)/sheet-links/page.tsx` — server component, renders:
```tsx
<div className="flex flex-col gap-6">
  <h1 className="text-xl font-semibold">Sheet Storage</h1>
  <SheetLinksClient />
</div>
```

### Client Component (`sheet-links-client.tsx`)

**Layout (top to bottom):**
1. Row: debounced search input (left) + "Add Link" button (right)
2. Tabs: "My Links (n)" / "Team Links (n)"
3. List of `SheetLinkRow` cards per tab

**Search:** debounced 300ms, value appended as `?q=` to SWR keys for both tabs. Both tabs re-fetch on query change.

**Tag-click filtering:** clicking a tag badge sets it as the current search query (same as typing it).

**SWR keys:**
- `/api/sheet-links?scope=mine&q=<query>`
- `/api/sheet-links?scope=team&q=<query>`

### `SheetLinkRow`

Each row displays:
- **Name** (bold)
- **URL** truncated + external link icon (opens in new tab)
- **Tags** as small badges (clickable to filter)
- **Created date**
- **Edit button** (owner only) — opens dialog pre-filled
- **Delete button** (owner only) — immediate with toast confirmation

Team tab rows show "by {email}" and have no edit/delete controls.

### Add/Edit Dialog

Single dialog component used for both add and edit modes.

Fields:
- **Name** — text input, required
- **URL** — text input, required
- **Tags** — tag input: type text + press Enter to add; each tag shown as a badge with × to remove
- **Share with team** — toggle switch

On save: POST (add) or PATCH (edit). Mutates both SWR keys on success. Shows toast on success/error.

### Sidebar

New entry in `navItems` in `components/layout/sidebar.tsx`:
```ts
{ href: '/sheet-links', label: 'Sheet Storage', icon: Database }
```
Inserted after the Shareables entry. `Database` icon imported from `lucide-react`.

---

## Error Handling

- Empty name or URL → client-side validation before submit, button disabled
- 403 on edit/delete → toast "You don't have permission to modify this link"
- 500 → toast "Something went wrong"
- Network error → SWR default retry

---

## Out of Scope

- URL format validation (accepting any string as URL)
- Predefined tag lists
- Tag management page
- Pagination (flat list, same as Shareables)
