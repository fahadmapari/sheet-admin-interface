# sheet-admin

Next.js 16 admin app for managing tour products. Google Sheets ("NET RATES") is the primary data store; MongoDB stores assembly batches and notifications. Auth via NextAuth + Google OAuth with an email allowlist.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

## Environment Variables

```env
MONGODB_URI=
NEXTAUTH_URL=                              # Required in production (e.g. https://yourdomain.com)
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SPREADSHEET_ID=                            # Shared Google Sheets document ID
GOOGLE_SERVICE_ACCOUNT_EMAIL=              # Automation-only service account
GOOGLE_PRIVATE_KEY=                        # Must include literal \n; lib/sheets.ts replaces them
```

## Architecture

```
app/
  (auth)/          # Login page (unauthenticated)
  (app)/           # Authenticated routes
    products/      # Main product list + editing
    assembly/      # Batch workflow (In Review → Uploaded)
    settings/
    shareables/
    sources/
  api/
    products/      # CRUD for TourProduct rows
    assembly/      # Assembly batch management
    export/        # google-sheet: creates spreadsheet in user's Drive
    filters/       # Dropdown filter options
    stats/         # Dashboard counts
    notifications/
    inventory-update/
    access-control/  # Allowlist + admin management
    column-groups/   # Column grouping config
    column-mapping/  # Column display mapping config

lib/
  sheets.ts          # Google Sheets/Drive I/O (user OAuth for UI, service account for automation)
  mongodb.ts         # MongoDB client (database: "sheet-admin")
  auth.ts            # NextAuth config
  types.ts           # TourProduct (70 fields), AssemblyBatch, AppNotification
  constants.ts
  fetcher.ts         # SWR fetcher helper
  access-control.ts  # Allowlist helpers (read/write accesscontrol collection)
  column-groups.ts   # Column grouping logic
  column-mapping.ts  # Column display name mapping
  column-utils.ts    # Shared column utilities
  design-system.ts   # Design tokens / theme constants
  notifications.ts   # Notification helpers
  utils.ts           # General utility functions
  hooks/
    use-column-groups.ts
    use-column-mapping.ts

components/
  ui/              # shadcn/ui primitives
  products/        # Product table, filters, edit forms
  assembly/        # Kanban-style batch board
  dashboard/
  layout/
  notifications/
  settings/
  providers/       # React context providers
  sidebar.tsx      # App sidebar nav
  mobile-top-bar.tsx
```

## Data Model

**Google Sheets ("NET RATES")** — 70 columns A–BR, mapped to `TourProduct` in `lib/types.ts`.
- Row 1 = header; data rows start at row 2.
- `rowIndex` is always **1-based** throughout the codebase.
- Column F (index 5) = product link field, used as the product name identifier.
- Link fields use the format `Display Text||https://url` (pipe-separated).

**MongoDB** (`sheet-admin` database):
- `assemblybatches` — `AssemblyBatch` documents (stages: In Review → 2nd Review → Buying Price → Selling Price → Ready for Upload → Uploaded)
- `stageconfig` — singleton document storing per-stage team owner assignments (`StageConfig`)
- `notifications` — `AppNotification` documents
- `notificationsubscriptions` — per-email stage subscriptions

## Gotchas

- **GOOGLE_PRIVATE_KEY**: Store with literal `\n` in env; `lib/sheets.ts` calls `.replace(/\\n/g, '\n')` at runtime.
- **User OAuth for Sheet UI**: Product reads/writes, filters, stats, dashboard reads, and exports use the signed-in user's Google OAuth token. Each allowed UI user must have access to `SPREADSHEET_ID`.
- **Service account**: Used for automation jobs, recovery scripts, AND for sharing the configured spreadsheet with new users (Settings → Access). It must have Editor role on `SPREADSHEET_ID` with "Editors can share" enabled (default). Other user-facing API routes should not silently fall back to it.
- **Google OAuth scopes** (lib/auth.ts): `openid email profile spreadsheets drive.file`. We deliberately request `drive.file` (only files the app creates) instead of full `drive` — sharing the configured spreadsheet runs through the service account so users are never asked to grant access to their whole Drive. Scope changes require existing users/admins to sign out and sign back in once.
- **Export to Google Sheets**: Uses the user's OAuth access token so the exported spreadsheet lands in the user's own Drive (works under `drive.file` because the app itself creates the file).
- **Auth allowlist**: Stored in the `accesscontrol` MongoDB collection (single document). On first sign-in attempt, auto-seeded with `adminEmails: [DEFAULT_ADMIN_EMAIL ?? "btechy4@gmail.com"]`. Allowlist is re-checked in the JWT callback every 5 min, so removing a user takes effect within that window. Use the Access tab in Settings (admin-only) to manage allowed emails and admins.
- **Middleware**: Lives in `proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`). All routes except `/api/auth/**`, `/_next/**`, `/login`, `/share/**` require an active session.
- **Default admin**: `DEFAULT_ADMIN_EMAIL` env var (optional, defaults to `btechy4@gmail.com`).
- **Sheet row deletion**: Uses `batchUpdate` with `deleteDimension` (requires numeric sheet ID, not name) — `getSheetId()` caches the lookup.
- **SWR + server components**: Client pages use SWR for data fetching; server-only code imports are guarded with `import 'server-only'`.
- **Next.js 16 async params/searchParams**: In route handlers and page components, `params` and `searchParams` must be `await`ed before accessing properties (e.g. `const { id } = await params`). Forgetting this causes runtime errors.
