# Access Control Settings — Design Spec

**Date:** 2026-04-08  
**Branch:** feat/export-to-google-sheet  

## Overview

Move the allowed-email allowlist from the `ALLOWED_EMAILS` env variable into MongoDB, and add a UI in Settings for managing who can log in and who can manage those settings. Only designated admin emails can see the Access tab.

---

## 1. Data Model

**Collection:** `accesscontrol` (single document)

```ts
interface AccessControlDoc {
  allowAll: boolean;       // if true, any Google account can sign in
  allowedEmails: string[]; // emails permitted to sign in (when allowAll is false)
  adminEmails: string[];   // emails that can view/manage the Access settings tab
}
```

**Seeding:** On the first `signIn` attempt, if the document does not exist, it is auto-created with:
```json
{ "allowAll": false, "allowedEmails": [], "adminEmails": ["btechy4@gmail.com"] }
```

---

## 2. Auth Changes (`lib/auth.ts`)

- The `signIn` callback reads from the `accesscontrol` MongoDB document instead of `ALLOWED_EMAILS` env.
- If `allowAll` is `true`: permit all sign-ins.
- Otherwise: permit only emails in `allowedEmails`.
- `ALLOWED_EMAILS` env var is no longer used for auth (can be removed from `.env`).

---

## 3. Helper: `lib/access-control.ts`

Encapsulates all DB reads/writes for the access control doc:

- `getAccessControl()` — fetches the doc, auto-seeds if missing. Includes a 30-second in-memory cache to avoid a DB hit on every request.
- `updateAccessControl(patch)` — upserts the full document.
- `isAdmin(email)` — returns true if the email is in `adminEmails`.

Cache is invalidated on every `updateAccessControl` call.

---

## 4. API Routes

### `GET /api/access-control`
- Requires active session. Returns 403 if session email is not in `adminEmails`.
- Returns: `{ allowAll, allowedEmails, adminEmails }`

### `PUT /api/access-control`
- Requires active session. Returns 403 if session email is not in `adminEmails`.
- Body: `{ allowAll?: boolean, allowedEmails?: string[], adminEmails?: string[] }`
- Replaces the full document with the provided values (merges with existing to handle partial updates).
- Returns the updated doc.

---

## 5. Settings UI

### Server Component (`app/(app)/settings/page.tsx`)
- Fetches session server-side via `getServerSession(authOptions)`.
- Fetches the access control doc via `getAccessControl()`.
- Conditionally renders the **"Access"** tab only if `session.user.email` is in `adminEmails`.

### Client Component: `components/settings/access-control-settings.tsx`
Receives initial `allowAll`, `allowedEmails`, `adminEmails` as props; manages local state and calls `PUT /api/access-control` on each change.

**Allow All toggle**
- Switches `allowAll` on/off.
- When enabled: shows a warning — "All Google accounts can sign in".
- Allowed Emails section is disabled/greyed out when Allow All is on.

**Allowed Emails section**
- Lists current emails with a remove (×) button per row.
- "Add email" text input + "Add" button.
- Disabled when `allowAll` is true.

**Admin Emails section**
- Same add/remove UI.
- If the current user removes their own email, show a confirmation: "You'll lose access to this tab — are you sure?".

Each add/remove immediately calls `PUT /api/access-control` with the full updated arrays. No explicit Save button.

---

## 6. Edge Cases

- **Last admin removal:** No hard block (the admin is warned when removing themselves). They can re-seed by going to MongoDB directly if needed.
- **allowAll + adminEmails:** Admin email check is always enforced regardless of `allowAll` — `allowAll` only affects sign-in, not the settings tab gate.
- **Cache invalidation:** The 30s in-memory cache means auth changes take effect within 30 seconds for sign-in checks. For the settings UI, data is always fetched fresh on page load.
- **Empty allowedEmails with allowAll=false:** Nobody can sign in except existing session holders — this is intentional and mirrors the previous env-based behavior.
