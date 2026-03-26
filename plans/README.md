# Implementation Plans

Run each plan in a **separate Claude Code session** to avoid context limits.
Each plan is self-contained — it describes what's already built and exactly what to implement next.

## How to run a plan

Open a new Claude Code session in `e:/projects/sheet-admin` and paste:

> "Please execute the plan in `plans/<filename>.md` using the subagent-driven-development skill."

## Plan order

| File | Tasks | What it builds |
|---|---|---|
| `phase-1b-foundation.md` | 3–5 | Types, constants, utils, API routes (GET), basic table + sidebar |
| `phase-2-table-ux.md` | 6–11 | Column groups, visibility presets, virtual scroll, filter bar, search, sticky columns |
| `phase-3-editing.md` | 12–15 | Inline cell edit, PUT/PATCH/POST API routes, product detail page, add new slide-over |
| `phase-4-bulk-and-workflow.md` | 16–19 | Row selection, bulk actions, bulk API route, delete with confirmation, CSV/XLSX export |
| `phase-5-dashboard-and-polish.md` | 20–24 | Dashboard (KPI + charts), Inventory Update page, loading/error states, URL filters, responsive sidebar |

## Already complete (this session)

- ✅ **Task 1** — Next.js 14 scaffold (TypeScript, Tailwind, shadcn/ui, 24 UI components)
- ✅ **Task 2** — Google Sheets API wrapper (`lib/sheets.ts`) with all CRUD functions, server-only guard, env validation, input guards

## Environment setup

Before running any plan, make sure `.env.local` exists with real values:
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
SPREADSHEET_ID=...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...  # generate with: openssl rand -base64 32
```
