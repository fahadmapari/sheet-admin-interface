# Sources page — design

Date: 2026-05-01
Status: Approved (pending implementation plan)

## Overview

Build out the currently-stub `/sources` page into a tour-discovery workflow:

1. Admin submits a tourist-office or provider website URL.
2. Firecrawl `/map` enumerates all URLs on the site.
3. Admin reviews the URL list and picks which subset to scrape (cap 500 pages).
4. Firecrawl `/crawl` scrapes the selected URLs.
5. Gemini 2.5 Flash classifies each page as a tour page or not, returning a confidence score, a suggested tour name, and a suggested city/country.
6. Admin reviews the candidate list (with editable fields) and imports selected rows into a new `sources` MongoDB collection. High-confidence rows are pre-selected via a configurable threshold.

The imported sources are a standalone backlog for v1 — no automatic linkage to the existing Products or Written Products flows.

## Goals

- Make it easy for admins to discover tours on third-party sites without manual link-hunting.
- Surface Gemini's confidence so a human can quickly triage candidates.
- Persist crawl history so prior scrapes can be revisited without re-running them.
- Keep cost predictable: cap pages, throttle to one concurrent crawl, and use the cheaper Firecrawl `/map` for triage before scraping.

## Non-goals (v1)

- Tour category classification (the `category` field is reserved but unused).
- Webhook-based Firecrawl integration (we poll Firecrawl instead).
- Sources → Written Products / Products promotion flow.
- Re-classifying an existing crawl with a new Gemini prompt via UI (data model supports it; UI deferred).
- Background workers or cron — all work is driven by client polling.
- Per-user rate limits beyond the global single-crawl lock.

## Architecture summary

```
Admin → /sources UI → /api/sources/* routes
                          │
                          ├── Firecrawl  (/map, /crawl)
                          ├── Gemini 2.5 Flash (structured-output classification)
                          └── MongoDB    (crawljobs, sources, crawljobs_lock)
```

All Firecrawl/Gemini work happens inside Next.js API routes triggered by client polling. Each `GET /api/sources/crawls/[id]` poll is opportunistic about advancing job state — no separate worker process required. Concurrency is bounded by:

- A global single-crawl lock (one job in `scraping` or `classifying` at any time).
- A `processingLockedUntil` timestamp per job to prevent two simultaneous polls from kicking off duplicate Gemini work.

## Data model

### MongoDB: `crawljobs`

One document per submitted crawl. Persistent (never auto-deleted; admin can archive).

```ts
interface CrawlJob {
  _id: string;
  submittedBy: string;             // email
  submittedAt: string;             // ISO
  rootUrl: string;
  providerName: string;
  defaultCountry: string;
  defaultCity: string;

  status:
    | 'mapping'
    | 'awaiting_url_selection'
    | 'scraping'
    | 'classifying'
    | 'ready_for_review'
    | 'failed'
    | 'archived';

  // Populated after Firecrawl /map completes
  mapResult: { urls: string[]; totalCount: number } | null;

  // Populated when admin confirms URL selection
  selectedUrls: string[] | null;

  // Populated after Firecrawl /crawl completes
  scrapeResult:
    | {
        url: string;
        title: string | null;
        metaDescription: string | null;
        markdownExcerpt: string;   // first 500 chars of cleaned markdown
      }[]
    | null;

  // Populated as Gemini batches complete
  classifications:
    | {
        url: string;
        title: string | null;
        suggestedTourName: string | null;
        suggestedCity: string | null;
        suggestedCountry: string | null;
        confidence: number;        // 0–100
        isTourPage: boolean;
        geminiNotes: string | null;
      }[]
    | null;

  error: string | null;

  // External job tracking
  firecrawlMapJobId: string | null;
  firecrawlCrawlJobId: string | null;

  // Concurrency / observability
  processingLockedUntil: string | null;  // ISO; auto-expires after 10 min
  costEstimate: { pagesScraped: number; geminiTokens: number } | null;
}
```

### MongoDB: `sources`

One document per imported tour.

```ts
interface Source {
  _id: string;
  crawlJobId: string;          // FK to crawljobs._id
  tourName: string;
  url: string;                 // duplicates allowed (two tours can live on one page)
  country: string;
  city: string;
  providerName: string;
  category: string | null;     // reserved for future
  geminiConfidence: number;    // snapshot at import
  importedBy: string;          // email
  importedAt: string;          // ISO
}
```

**Uniqueness key**: `(tourName, crawlJobId)` — duplicate URLs are allowed (because two tours may share a URL); the same tour name may appear across different crawl jobs.

### MongoDB: `crawljobs_lock`

Singleton document enforcing global single-crawl concurrency.

```ts
interface CrawlLock {
  _id: 'global';
  jobId: string | null;        // currently-locked job, or null
  acquiredAt: string | null;   // ISO; lock auto-expires after 30 min
}
```

## Crawl workflow

### 1. Submit
- Admin fills `New Crawl` form: `rootUrl`, `providerName`, `defaultCountry`, `defaultCity`.
- `POST /api/sources/crawls` creates a `crawljobs` doc with `status: 'mapping'` and kicks off Firecrawl `/map`.
- Returns `{ id, status }`. UI navigates to `/sources/crawls/[id]`.

### 2. Mapping
- Client polls `GET /api/sources/crawls/[id]` every 3s.
- The poll handler checks Firecrawl `/map` status. When URLs are returned:
  - Stores `mapResult`.
  - Transitions status to `awaiting_url_selection`.

### 3. URL selection
- UI renders the URL list with:
  - A search/filter input.
  - Select-all and select-none controls.
  - A `Selected: N / 500` counter.
  - A `Start Scrape` button (disabled if `N > 500` or `N === 0`).
- A heuristic auto-selects URLs whose path matches `/tour`, `/experience`, `/excursion`, `/visit`, `/activity` (case-insensitive). Pure UX nicety — admin can override.
- Confirm → `POST /api/sources/crawls/[id]/scrape` with `selectedUrls`.
- Server validates count ≤ 500, attempts to acquire the global crawl lock. If unavailable, returns 409 with the in-progress job's id/provider. On success, transitions status to `scraping`, kicks off Firecrawl `/crawl` with the selected URLs.

### 4. Scraping
- Client continues polling. Poll handler checks Firecrawl crawl status.
- On completion, stores `scrapeResult` (only the fields we need: `url`, `title`, `metaDescription`, first 500 chars of `markdown`). Transitions to `classifying`.

### 5. Classifying
- Poll handler batches scraped pages (20 per request) and calls Gemini 2.5 Flash with a structured-output prompt.
- Prompt request shape (per page): `{ url, title, metaDescription, markdownExcerpt }`.
- Prompt response shape (per page): `{ url, isTourPage, confidence, suggestedTourName, suggestedCity, suggestedCountry, notes }`.
- Successful batch results are appended to `classifications`. The handler uses `processingLockedUntil` to prevent two concurrent polls from both running Gemini work; if locked, the poll returns the current state and the next poll will pick up where the previous one left off.
- Per-batch retry: up to 3 attempts with exponential backoff. If a batch ultimately fails, its pages are stored with `confidence: 0, isTourPage: false, geminiNotes: 'classification failed'` so the admin can still review them manually.
- When all pages are classified, transitions to `ready_for_review` and releases the global crawl lock.

### 6. Review and import
- UI renders the candidates table (see UI spec below).
- Admin selects rows (default: all rows where `confidence ≥ slider value`, default 75) and may edit `tourName`, `suggestedCity`, `suggestedCountry` per row.
- Submit → `POST /api/sources/crawls/[id]/import` with `{ items: [{ url, tourName, city, country, confidence }] }`.
- Server creates `sources` records. Duplicates (same `tourName` within this crawl) are skipped silently; response reports `{ importedCount, skippedCount }`.
- Job status stays `ready_for_review` — admin can return later and import additional rows.

## Failure handling

- **Firecrawl failure** (network, quota, invalid URL): caught at each stage, `crawljobs.status` set to `failed` with the error message, global lock released. `Retry` re-runs only the failed stage.
- **Gemini failure**: per-batch retry as above. Whole-job failure only if every batch fails.
- **Lock contention**: `POST /scrape` returns 409 with `{ inProgressJob: { id, providerName } }`. UI shows a banner identifying the active crawl.
- **Stale lock**: `processingLockedUntil` auto-expires after 10 min; `crawljobs_lock.acquiredAt` after 30 min. Stale locks are treated as released.
- **Schema drift from Gemini**: structured-output mode minimizes risk; malformed responses fall through to the per-batch failure path.
- **Auth**: admin check via existing `accesscontrol` helpers. Non-admin GETs of crawl history allowed for any allowlisted user (read-only); writes (submit, scrape, import, retry, archive, delete) admin-only. (Open question for plan — can be tightened to admin-only across the board if preferred.)

## Edge cases

- Re-importing into a `ready_for_review` job is allowed; uniqueness only blocks the *same* `tourName` within the same crawl.
- A `/map` result larger than 500 URLs forces the admin to filter; `/scrape` validates the count again server-side.
- Edited `tourName`/`city`/`country` are stored on `sources`, not back on `classifications` (we never mutate Gemini's output).
- Archived crawls are hidden from the default index list but reachable via `Show archived` toggle.

## API endpoints

All under `/api/sources/`. All routes return standard `{ error: string }` shape on failure.

### Crawl jobs
- `POST /api/sources/crawls` — body `{ rootUrl, providerName, defaultCountry, defaultCity }`. Admin only. Creates job, kicks off `/map`. Returns `{ id, status }`.
- `GET /api/sources/crawls` — list jobs, newest first, paginated. Returns `{ jobs: [{ id, providerName, rootUrl, status, submittedAt, submittedBy, candidateCount, importedCount }] }`. `?archived=true` includes archived jobs.
- `GET /api/sources/crawls/[id]` — full job detail. **Polling endpoint**: opportunistically advances state (mapping → awaiting_url_selection, scraping → classifying, classifying → ready_for_review). Idempotent.
- `POST /api/sources/crawls/[id]/scrape` — body `{ selectedUrls }`. Admin only. Validates ≤ 500, acquires global lock. 409 if another crawl is active.
- `POST /api/sources/crawls/[id]/retry` — admin only. Re-runs the failed stage.
- `POST /api/sources/crawls/[id]/import` — body `{ items: [{ url, tourName, city, country, confidence }] }`. Admin only. Creates `sources` records, returns `{ importedCount, skippedCount }`.
- `DELETE /api/sources/crawls/[id]` — admin only. Soft delete: sets `status: 'archived'`.

### Imported sources
- `GET /api/sources` — list imported sources. Filters: `country`, `city`, `provider`, `q`. Paginated.
- `DELETE /api/sources/[id]` — admin only. Hard delete.

## UI

### `/sources` (index)
- Header: "Sources" + `New Crawl` button (admin only).
- Two tabs:
  - **Imported Sources** — list of `sources`, search by name, filter by country/city/provider. Each row: tour name, provider, city, country, source URL (link), confidence pill, imported by/at, delete button (admin only).
  - **Crawl History** — list of `crawljobs` with status badges and `Show archived` toggle. Click a row → crawl detail.

### `/sources/new` (or modal on the index)
- Fields: `Root URL`, `Provider name`, `Default country` (combobox seeded from existing `TourProduct` countries), `Default city` (combobox).
- Submit creates the job and routes to `/sources/crawls/[id]`.

### `/sources/crawls/[id]` (crawl detail)
- Header: status pill, provider name, root URL, submitted-by/at.
- Body switches by status:
  - `mapping` / `scraping` / `classifying`: spinner, status copy, "what's happening now" hint. Polls every 3s.
  - `awaiting_url_selection`: searchable URL list with checkboxes, `Selected: N / 500` counter, `Start Scrape` button.
  - `ready_for_review`: candidates table.
  - `failed`: error message + `Retry` button (admin only).
  - `archived`: read-only banner; classifications still visible if present.

### Candidates table
- Columns: checkbox, confidence pill (green ≥ 80, amber 60–79, grey < 60), `tourName` (editable), URL (link), suggested city (editable combobox), suggested country (editable combobox), Gemini notes (truncated, hover for full).
- Top controls: confidence threshold slider (default 75 — auto-checks rows whose confidence ≥ threshold without overriding manual toggles), search box, `Select all visible / Deselect all`, `Import N selected` button.
- Already-imported rows: rendered with a checkmark and read-only (cannot re-import the same `tourName` within this crawl).

### Mobile
- Candidates table collapses to stacked cards (matches existing mobile-responsiveness pattern in this app).

## Configuration / env vars

New env vars:

```env
FIRECRAWL_API_KEY=
GEMINI_API_KEY=
```

Hard-coded constants (in `lib/sources.ts` or similar):
- `MAX_PAGES_PER_CRAWL = 500`
- `GEMINI_BATCH_SIZE = 20`
- `MARKDOWN_EXCERPT_CHARS = 500`
- `DEFAULT_CONFIDENCE_THRESHOLD = 75`
- `PROCESSING_LOCK_TTL_MS = 10 * 60 * 1000`
- `GLOBAL_CRAWL_LOCK_TTL_MS = 30 * 60 * 1000`
- `TOUR_URL_HEURISTIC_PATTERNS = ['/tour', '/experience', '/excursion', '/visit', '/activity']`

## File layout (proposed)

```
app/(app)/sources/
  page.tsx                          # index view (tabs)
  sources-client.tsx                # client component for index
  new/
    page.tsx                        # new-crawl form (or modal on index)
  crawls/[id]/
    page.tsx
    crawl-detail-client.tsx

app/api/sources/
  route.ts                          # GET imported sources
  [id]/route.ts                     # DELETE imported source
  crawls/route.ts                   # POST submit, GET list
  crawls/[id]/route.ts              # GET (poll/advance), DELETE (archive)
  crawls/[id]/scrape/route.ts       # POST start scrape
  crawls/[id]/retry/route.ts        # POST retry failed stage
  crawls/[id]/import/route.ts       # POST import selected

lib/
  sources.ts                        # constants + helpers
  firecrawl.ts                      # Firecrawl client wrapper
  gemini.ts                         # Gemini classifier wrapper (structured output)
  crawl-job-state.ts                # status transition helpers + lock acquisition
  hooks/
    use-crawl-job.ts                # SWR-based polling hook
    use-imported-sources.ts
```

## Open questions for the implementation plan

- Exact prompt text for Gemini classification (will be drafted during implementation).
- Whether to expose the URL-selection heuristic patterns as configurable constants vs. user-editable settings (default: hard-coded constants for v1).
- Whether `GET /api/sources/crawls/[id]` should be admin-only or readable by all allowlisted users (suggest: read-all, write-admin).
- Whether the `New Crawl` form is a modal or a route — both are acceptable; pick during implementation based on form complexity.
