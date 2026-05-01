# Sources page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/sources` placeholder page with a tour-discovery workflow that crawls a website with Firecrawl, classifies pages with Gemini 2.5 Flash, lets the admin review and import selected tours into a new `sources` collection.

**Architecture:** Client polls `GET /api/sources/crawls/[id]`, which opportunistically advances job state through stages (mapping → awaiting_url_selection → scraping → classifying → ready_for_review). No background workers. A global single-crawl lock + per-job `processingLockedUntil` prevent concurrent work. New MongoDB collections: `crawljobs`, `sources`, `crawljobs_lock`. New env vars: `FIRECRAWL_API_KEY`, `GEMINI_API_KEY`.

**Tech Stack:** Next.js 16 App Router, MongoDB (driver `mongodb@^7`), `@mendable/firecrawl-js`, `@google/genai`, NextAuth (email allowlist + admin role), SWR for polling, shadcn/ui primitives, Tailwind.

**Testing approach:** This codebase has no test framework. Each task's verification uses `npx tsc --noEmit`, `npm run lint`, `npm run build`, plus `curl` for API contracts and a manual browser smoke check for UI. Do **not** introduce a test framework — match the existing project convention.

**Reference spec:** [docs/superpowers/specs/2026-05-01-sources-page-design.md](../specs/2026-05-01-sources-page-design.md)

---

## File map

```
lib/
  types.ts                              # MODIFY — add CrawlJob, CrawlJobStatus, ClassificationResult, Source types
  sources/
    constants.ts                        # CREATE — caps, batch sizes, TTLs, URL heuristics
    crawl-jobs.ts                       # CREATE — crawljobs CRUD + state transitions
    crawl-lock.ts                       # CREATE — global single-crawl lock
    sources-store.ts                    # CREATE — sources CRUD
    firecrawl.ts                        # CREATE — Firecrawl SDK wrapper (map + crawl)
    gemini.ts                           # CREATE — Gemini structured-output classifier
    state-machine.ts                    # CREATE — opportunistic state advancement (called from GET poll)
  hooks/
    use-crawl-job.ts                    # CREATE — SWR polling hook
    use-imported-sources.ts             # CREATE — SWR list hook

app/api/sources/
  route.ts                              # CREATE — GET imported sources (filters/search)
  [id]/route.ts                         # CREATE — DELETE imported source
  crawls/route.ts                       # CREATE — POST submit, GET list
  crawls/[id]/route.ts                  # CREATE — GET (poll/advance), DELETE (archive)
  crawls/[id]/scrape/route.ts           # CREATE — POST start scrape
  crawls/[id]/retry/route.ts            # CREATE — POST retry failed stage
  crawls/[id]/import/route.ts           # CREATE — POST import selected

app/(app)/sources/
  page.tsx                              # MODIFY — replace placeholder with index tabs
  sources-index-client.tsx              # CREATE — tabs + lists (admin-gated New Crawl button)
  imported-sources-list.tsx             # CREATE — imported tab content
  crawl-history-list.tsx                # CREATE — crawl history tab content
  new-crawl-dialog.tsx                  # CREATE — modal form
  crawls/[id]/page.tsx                  # CREATE — server component, passes id to client
  crawls/[id]/crawl-detail-client.tsx   # CREATE — status-driven view switcher
  crawls/[id]/url-selection.tsx         # CREATE — URL list + checkboxes step
  crawls/[id]/candidates-table.tsx      # CREATE — review table + slider + import
  crawls/[id]/in-progress-card.tsx      # CREATE — spinner card for mapping/scraping/classifying

components/ui/
  slider.tsx                            # CREATE — Radix slider primitive (not yet present)
```

---

## Task 1: Add types to `lib/types.ts`

**Files:**
- Modify: `lib/types.ts` (append at end of file)

- [ ] **Step 1: Add the new types**

Append to `lib/types.ts`:

```ts
// ─── Sources / Crawl ─────────────────────────────────────────────────────────

export type CrawlJobStatus =
  | 'mapping'
  | 'awaiting_url_selection'
  | 'scraping'
  | 'classifying'
  | 'ready_for_review'
  | 'failed'
  | 'archived';

export interface ScrapedPage {
  url: string;
  title: string | null;
  metaDescription: string | null;
  markdownExcerpt: string;
}

export interface ClassificationResult {
  url: string;
  title: string | null;
  suggestedTourName: string | null;
  suggestedCity: string | null;
  suggestedCountry: string | null;
  confidence: number; // 0–100
  isTourPage: boolean;
  geminiNotes: string | null;
}

export interface CrawlJob {
  _id: string;
  submittedBy: string;
  submittedAt: string; // ISO
  rootUrl: string;
  providerName: string;
  defaultCountry: string;
  defaultCity: string;
  status: CrawlJobStatus;
  mapResult: { urls: string[]; totalCount: number } | null;
  selectedUrls: string[] | null;
  scrapeResult: ScrapedPage[] | null;
  classifications: ClassificationResult[] | null;
  error: string | null;
  firecrawlMapJobId: string | null;
  firecrawlCrawlJobId: string | null;
  processingLockedUntil: string | null; // ISO
  costEstimate: { pagesScraped: number; geminiTokens: number } | null;
}

export interface CrawlJobSummary {
  _id: string;
  rootUrl: string;
  providerName: string;
  status: CrawlJobStatus;
  submittedAt: string;
  submittedBy: string;
  candidateCount: number;
  importedCount: number;
}

export interface Source {
  _id: string;
  crawlJobId: string;
  tourName: string;
  url: string;
  country: string;
  city: string;
  providerName: string;
  category: string | null;
  geminiConfidence: number;
  importedBy: string;
  importedAt: string; // ISO
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS (no type errors).

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(sources): add CrawlJob and Source types"
```

---

## Task 2: Add constants module

**Files:**
- Create: `lib/sources/constants.ts`

- [ ] **Step 1: Create the file**

```ts
// lib/sources/constants.ts
export const MAX_PAGES_PER_CRAWL = 500;
export const GEMINI_BATCH_SIZE = 20;
export const MARKDOWN_EXCERPT_CHARS = 500;
export const DEFAULT_CONFIDENCE_THRESHOLD = 75;
export const PROCESSING_LOCK_TTL_MS = 10 * 60 * 1000;     // 10 min
export const GLOBAL_CRAWL_LOCK_TTL_MS = 30 * 60 * 1000;   // 30 min
export const TOUR_URL_HEURISTIC_PATTERNS = [
  '/tour',
  '/experience',
  '/excursion',
  '/visit',
  '/activity',
];

export const COLLECTIONS = {
  crawlJobs: 'crawljobs',
  sources: 'sources',
  crawlLock: 'crawljobs_lock',
} as const;

export const CRAWL_LOCK_SINGLETON_ID = 'global';
```

- [ ] **Step 2: Type check + commit**

Run: `npx tsc --noEmit`
Expected: PASS.

```bash
git add lib/sources/constants.ts
git commit -m "feat(sources): add constants module"
```

---

## Task 3: MongoDB layer for `crawljobs`

**Files:**
- Create: `lib/sources/crawl-jobs.ts`

- [ ] **Step 1: Create the file**

```ts
import 'server-only';
import { ObjectId, type WithId, type Document } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { COLLECTIONS } from './constants';
import type {
  CrawlJob,
  CrawlJobStatus,
  CrawlJobSummary,
  ClassificationResult,
  ScrapedPage,
} from '@/lib/types';

function toCrawlJob(doc: WithId<Document>): CrawlJob {
  return {
    _id: doc._id.toString(),
    submittedBy: doc.submittedBy,
    submittedAt: (doc.submittedAt as Date).toISOString(),
    rootUrl: doc.rootUrl,
    providerName: doc.providerName,
    defaultCountry: doc.defaultCountry,
    defaultCity: doc.defaultCity,
    status: doc.status as CrawlJobStatus,
    mapResult: doc.mapResult ?? null,
    selectedUrls: doc.selectedUrls ?? null,
    scrapeResult: doc.scrapeResult ?? null,
    classifications: doc.classifications ?? null,
    error: doc.error ?? null,
    firecrawlMapJobId: doc.firecrawlMapJobId ?? null,
    firecrawlCrawlJobId: doc.firecrawlCrawlJobId ?? null,
    processingLockedUntil:
      doc.processingLockedUntil instanceof Date
        ? doc.processingLockedUntil.toISOString()
        : null,
    costEstimate: doc.costEstimate ?? null,
  };
}

export interface CreateCrawlJobInput {
  rootUrl: string;
  providerName: string;
  defaultCountry: string;
  defaultCity: string;
  submittedBy: string;
}

export async function createCrawlJob(input: CreateCrawlJobInput): Promise<CrawlJob> {
  const db = await getDb();
  const now = new Date();
  const doc = {
    rootUrl: input.rootUrl,
    providerName: input.providerName,
    defaultCountry: input.defaultCountry,
    defaultCity: input.defaultCity,
    submittedBy: input.submittedBy,
    submittedAt: now,
    status: 'mapping' as CrawlJobStatus,
    mapResult: null,
    selectedUrls: null,
    scrapeResult: null,
    classifications: null,
    error: null,
    firecrawlMapJobId: null,
    firecrawlCrawlJobId: null,
    processingLockedUntil: null,
    costEstimate: null,
  };
  const result = await db.collection(COLLECTIONS.crawlJobs).insertOne(doc);
  return toCrawlJob({ _id: result.insertedId, ...doc } as WithId<Document>);
}

export async function getCrawlJob(id: string): Promise<CrawlJob | null> {
  const db = await getDb();
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return null;
  }
  const doc = await db.collection(COLLECTIONS.crawlJobs).findOne({ _id: oid });
  return doc ? toCrawlJob(doc) : null;
}

export interface ListCrawlJobsOptions {
  includeArchived?: boolean;
  limit?: number;
}

export async function listCrawlJobs(
  options: ListCrawlJobsOptions = {},
): Promise<CrawlJobSummary[]> {
  const db = await getDb();
  const filter = options.includeArchived ? {} : { status: { $ne: 'archived' } };
  const docs = await db
    .collection(COLLECTIONS.crawlJobs)
    .find(filter)
    .sort({ submittedAt: -1 })
    .limit(options.limit ?? 100)
    .toArray();

  // Imported counts come from a single aggregated query (avoids N+1).
  const ids = docs.map((d) => d._id.toString());
  const importCounts = await db
    .collection(COLLECTIONS.sources)
    .aggregate([
      { $match: { crawlJobId: { $in: ids } } },
      { $group: { _id: '$crawlJobId', count: { $sum: 1 } } },
    ])
    .toArray();
  const importMap = new Map(importCounts.map((r) => [r._id as string, r.count as number]));

  return docs.map((d) => ({
    _id: d._id.toString(),
    rootUrl: d.rootUrl,
    providerName: d.providerName,
    status: d.status as CrawlJobStatus,
    submittedAt: (d.submittedAt as Date).toISOString(),
    submittedBy: d.submittedBy,
    candidateCount: Array.isArray(d.classifications) ? d.classifications.length : 0,
    importedCount: importMap.get(d._id.toString()) ?? 0,
  }));
}

export async function updateCrawlJob(
  id: string,
  patch: Partial<{
    status: CrawlJobStatus;
    mapResult: { urls: string[]; totalCount: number };
    selectedUrls: string[];
    scrapeResult: ScrapedPage[];
    classifications: ClassificationResult[];
    error: string | null;
    firecrawlMapJobId: string;
    firecrawlCrawlJobId: string;
    processingLockedUntil: Date | null;
    costEstimate: { pagesScraped: number; geminiTokens: number };
  }>,
): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTIONS.crawlJobs).updateOne(
    { _id: new ObjectId(id) },
    { $set: patch },
  );
}

export async function archiveCrawlJob(id: string): Promise<'archived' | 'not_found'> {
  const db = await getDb();
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return 'not_found';
  }
  const result = await db.collection(COLLECTIONS.crawlJobs).updateOne(
    { _id: oid },
    { $set: { status: 'archived' as CrawlJobStatus } },
  );
  return result.matchedCount === 0 ? 'not_found' : 'archived';
}

// Atomic compare-and-set: claims the per-job processing lock if it is unset
// or already expired. Returns true if this caller acquired it.
export async function tryClaimProcessingLock(
  id: string,
  ttlMs: number,
): Promise<boolean> {
  const db = await getDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);
  const result = await db.collection(COLLECTIONS.crawlJobs).updateOne(
    {
      _id: new ObjectId(id),
      $or: [
        { processingLockedUntil: null },
        { processingLockedUntil: { $lte: now } },
      ],
    },
    { $set: { processingLockedUntil: expiresAt } },
  );
  return result.modifiedCount === 1;
}

export async function releaseProcessingLock(id: string): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTIONS.crawlJobs).updateOne(
    { _id: new ObjectId(id) },
    { $set: { processingLockedUntil: null } },
  );
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/sources/crawl-jobs.ts
git commit -m "feat(sources): add crawl-jobs MongoDB layer"
```

---

## Task 4: Global crawl lock module

**Files:**
- Create: `lib/sources/crawl-lock.ts`

- [ ] **Step 1: Create the file**

```ts
import 'server-only';
import { getDb } from '@/lib/mongodb';
import { COLLECTIONS, CRAWL_LOCK_SINGLETON_ID, GLOBAL_CRAWL_LOCK_TTL_MS } from './constants';

interface CrawlLockDoc {
  _id: string;
  jobId: string | null;
  acquiredAt: Date | null;
}

// Atomic acquire: succeeds only if no current lock OR the existing lock has
// expired OR the existing lock already belongs to this jobId (idempotent).
export async function tryAcquireGlobalCrawlLock(jobId: string): Promise<
  | { ok: true }
  | { ok: false; heldBy: string }
> {
  const db = await getDb();
  const now = new Date();
  const expiry = new Date(now.getTime() - GLOBAL_CRAWL_LOCK_TTL_MS);

  const result = await (db.collection(COLLECTIONS.crawlLock) as any).findOneAndUpdate(
    {
      _id: CRAWL_LOCK_SINGLETON_ID,
      $or: [
        { jobId: null },
        { jobId: jobId },
        { acquiredAt: null },
        { acquiredAt: { $lt: expiry } },
      ],
    },
    { $set: { _id: CRAWL_LOCK_SINGLETON_ID, jobId, acquiredAt: now } },
    { upsert: true, returnDocument: 'after' },
  );

  const doc = (result?.value ?? result) as CrawlLockDoc | null;
  if (doc && doc.jobId === jobId) return { ok: true };

  // Another job holds it. Read who.
  const current = await db
    .collection(COLLECTIONS.crawlLock)
    .findOne({ _id: CRAWL_LOCK_SINGLETON_ID });
  return { ok: false, heldBy: (current?.jobId as string) ?? 'unknown' };
}

export async function releaseGlobalCrawlLock(jobId: string): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTIONS.crawlLock).updateOne(
    { _id: CRAWL_LOCK_SINGLETON_ID, jobId },
    { $set: { jobId: null, acquiredAt: null } },
  );
}

export async function getGlobalCrawlLockHolder(): Promise<string | null> {
  const db = await getDb();
  const doc = await db.collection(COLLECTIONS.crawlLock).findOne({ _id: CRAWL_LOCK_SINGLETON_ID });
  if (!doc?.jobId) return null;
  const acquiredAt = doc.acquiredAt as Date | null;
  if (!acquiredAt) return null;
  if (Date.now() - acquiredAt.getTime() >= GLOBAL_CRAWL_LOCK_TTL_MS) return null;
  return doc.jobId as string;
}
```

- [ ] **Step 2: Type check + commit**

Run: `npx tsc --noEmit`
Expected: PASS.

```bash
git add lib/sources/crawl-lock.ts
git commit -m "feat(sources): add global crawl lock module"
```

---

## Task 5: Sources store (imported-tour CRUD)

**Files:**
- Create: `lib/sources/sources-store.ts`

- [ ] **Step 1: Create the file**

```ts
import 'server-only';
import { ObjectId, type WithId, type Document } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { COLLECTIONS } from './constants';
import type { Source } from '@/lib/types';

function toSource(doc: WithId<Document>): Source {
  return {
    _id: doc._id.toString(),
    crawlJobId: doc.crawlJobId,
    tourName: doc.tourName,
    url: doc.url,
    country: doc.country,
    city: doc.city,
    providerName: doc.providerName,
    category: doc.category ?? null,
    geminiConfidence: doc.geminiConfidence ?? 0,
    importedBy: doc.importedBy,
    importedAt: (doc.importedAt as Date).toISOString(),
  };
}

export interface ImportSourceInput {
  crawlJobId: string;
  tourName: string;
  url: string;
  country: string;
  city: string;
  providerName: string;
  geminiConfidence: number;
  importedBy: string;
}

export interface ImportResult {
  importedCount: number;
  skippedCount: number;
  imported: Source[];
}

// Bulk insert. Skips items whose (tourName, crawlJobId) is already present.
export async function importSources(items: ImportSourceInput[]): Promise<ImportResult> {
  if (items.length === 0) return { importedCount: 0, skippedCount: 0, imported: [] };
  const db = await getDb();

  const existing = await db
    .collection(COLLECTIONS.sources)
    .find({
      crawlJobId: items[0].crawlJobId,
      tourName: { $in: items.map((i) => i.tourName) },
    })
    .project({ tourName: 1 })
    .toArray();
  const existingNames = new Set(existing.map((d) => d.tourName as string));

  const toInsert = items.filter((i) => !existingNames.has(i.tourName));
  const skippedCount = items.length - toInsert.length;
  if (toInsert.length === 0) return { importedCount: 0, skippedCount, imported: [] };

  const now = new Date();
  const docs = toInsert.map((i) => ({
    crawlJobId: i.crawlJobId,
    tourName: i.tourName,
    url: i.url,
    country: i.country,
    city: i.city,
    providerName: i.providerName,
    category: null,
    geminiConfidence: i.geminiConfidence,
    importedBy: i.importedBy,
    importedAt: now,
  }));
  const result = await db.collection(COLLECTIONS.sources).insertMany(docs);
  const inserted: Source[] = Object.entries(result.insertedIds).map(([idx, id]) =>
    toSource({ _id: id, ...docs[Number(idx)] } as WithId<Document>),
  );
  return { importedCount: inserted.length, skippedCount, imported: inserted };
}

export interface ListSourcesFilters {
  country?: string;
  city?: string;
  provider?: string;
  q?: string;
  limit?: number;
}

export async function listSources(filters: ListSourcesFilters): Promise<Source[]> {
  const db = await getDb();
  const where: Record<string, unknown> = {};
  if (filters.country) where.country = filters.country;
  if (filters.city) where.city = filters.city;
  if (filters.provider) where.providerName = filters.provider;
  if (filters.q?.trim()) {
    const regex = { $regex: filters.q.trim(), $options: 'i' };
    where.$or = [{ tourName: regex }, { url: regex }];
  }
  const docs = await db
    .collection(COLLECTIONS.sources)
    .find(where)
    .sort({ importedAt: -1 })
    .limit(filters.limit ?? 200)
    .toArray();
  return docs.map((d) => toSource(d));
}

export async function deleteSource(id: string): Promise<'deleted' | 'not_found'> {
  const db = await getDb();
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return 'not_found';
  }
  const result = await db.collection(COLLECTIONS.sources).deleteOne({ _id: oid });
  return result.deletedCount === 1 ? 'deleted' : 'not_found';
}
```

- [ ] **Step 2: Type check + commit**

```bash
npx tsc --noEmit
git add lib/sources/sources-store.ts
git commit -m "feat(sources): add sources store"
```

---

## Task 6: Firecrawl client wrapper

**Files:**
- Modify: `package.json` (add `@mendable/firecrawl-js`)
- Create: `lib/sources/firecrawl.ts`

- [ ] **Step 1: Install the SDK**

```bash
npm install @mendable/firecrawl-js
```

Expected: dependency added to `package.json`.

- [ ] **Step 2: Create the wrapper**

```ts
// lib/sources/firecrawl.ts
import 'server-only';
import FirecrawlApp from '@mendable/firecrawl-js';
import { MARKDOWN_EXCERPT_CHARS } from './constants';
import type { ScrapedPage } from '@/lib/types';

function getClient(): FirecrawlApp {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error('Missing FIRECRAWL_API_KEY environment variable');
  return new FirecrawlApp({ apiKey });
}

// Returns the URL list discovered by Firecrawl /map. Synchronous from our
// perspective — Firecrawl /map is fast (seconds for typical sites).
export async function mapSite(rootUrl: string): Promise<{ urls: string[]; totalCount: number }> {
  const client = getClient();
  const res = await client.mapUrl(rootUrl, { limit: 5000 });
  if (!res.success) throw new Error(`Firecrawl /map failed: ${res.error ?? 'unknown'}`);
  const urls = (res.links ?? []).filter((u): u is string => typeof u === 'string');
  return { urls, totalCount: urls.length };
}

// Submit a /crawl job. Returns the Firecrawl job ID for later polling.
export async function startCrawl(urls: string[]): Promise<string> {
  const client = getClient();
  // Firecrawl's batch-scrape lets us pass an explicit URL list rather than crawl-from-root.
  const res = await client.asyncBatchScrapeUrls(urls, {
    formats: ['markdown'],
  });
  if (!res.success) throw new Error(`Firecrawl batch-scrape submit failed: ${res.error ?? 'unknown'}`);
  return res.id;
}

export interface CrawlPollResult {
  status: 'completed' | 'in_progress' | 'failed';
  pages: ScrapedPage[];
  error?: string;
}

// Poll a previously started crawl job. Trims markdown to MARKDOWN_EXCERPT_CHARS.
export async function pollCrawl(jobId: string): Promise<CrawlPollResult> {
  const client = getClient();
  const res = await client.checkBatchScrapeStatus(jobId);
  if (!res.success) {
    return { status: 'failed', pages: [], error: res.error ?? 'unknown' };
  }
  const status =
    res.status === 'completed' ? 'completed' : res.status === 'failed' ? 'failed' : 'in_progress';
  const pages: ScrapedPage[] = (res.data ?? []).map((d: any) => ({
    url: (d.metadata?.sourceURL ?? d.metadata?.url ?? '') as string,
    title: (d.metadata?.title as string | undefined) ?? null,
    metaDescription: (d.metadata?.description as string | undefined) ?? null,
    markdownExcerpt: ((d.markdown as string | undefined) ?? '').slice(0, MARKDOWN_EXCERPT_CHARS),
  }));
  return { status, pages, error: res.error };
}
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: PASS. If the Firecrawl SDK's response shape differs from what's referenced above (the SDK's exact type names have shifted across versions), narrow types with `any` only where strictly necessary and document the workaround in a one-line comment.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json lib/sources/firecrawl.ts
git commit -m "feat(sources): add Firecrawl client wrapper"
```

---

## Task 7: Gemini classifier wrapper

**Files:**
- Modify: `package.json` (add `@google/genai`)
- Create: `lib/sources/gemini.ts`

- [ ] **Step 1: Install the SDK**

```bash
npm install @google/genai
```

- [ ] **Step 2: Create the wrapper**

```ts
// lib/sources/gemini.ts
import 'server-only';
import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_BATCH_SIZE } from './constants';
import type { ScrapedPage, ClassificationResult } from '@/lib/types';

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY environment variable');
  return new GoogleGenAI({ apiKey });
}

const MODEL_ID = 'gemini-2.5-flash';

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    results: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          url: { type: Type.STRING },
          isTourPage: { type: Type.BOOLEAN },
          confidence: { type: Type.INTEGER },
          suggestedTourName: { type: Type.STRING, nullable: true },
          suggestedCity: { type: Type.STRING, nullable: true },
          suggestedCountry: { type: Type.STRING, nullable: true },
          notes: { type: Type.STRING, nullable: true },
        },
        required: ['url', 'isTourPage', 'confidence'],
      },
    },
  },
  required: ['results'],
};

const SYSTEM_PROMPT = `You are classifying scraped web pages from a tourism provider's website.
For each page, decide whether it describes ONE specific bookable tour, day-trip, excursion, or guided experience.
- Mark isTourPage=true ONLY if the page is the dedicated landing page for a single tour product.
- Listing/category pages (e.g. "All Rome tours"), homepages, contact pages, blog posts, and policy pages are NOT tour pages.
- Confidence is 0–100 reflecting your certainty about isTourPage.
- suggestedTourName: extract a clean human-readable tour name (no "| Site Name" suffixes).
- suggestedCity / suggestedCountry: extract from the page content if present, else null.
- notes: 1-line summary of why you classified it this way (max 120 chars).`;

interface ClassifyBatchInput {
  pages: ScrapedPage[];
  defaultCity: string;
  defaultCountry: string;
  providerName: string;
}

async function classifyBatch(input: ClassifyBatchInput): Promise<ClassificationResult[]> {
  const client = getClient();
  const userParts = input.pages
    .map((p, i) => {
      return `[${i}] URL: ${p.url}
TITLE: ${p.title ?? '(none)'}
META: ${p.metaDescription ?? '(none)'}
EXCERPT: ${p.markdownExcerpt}`;
    })
    .join('\n\n---\n\n');

  const userPrompt = `Provider: ${input.providerName}
Default city if you can't determine one: ${input.defaultCity}
Default country if you can't determine one: ${input.defaultCountry}

Pages to classify:

${userParts}`;

  const response = await client.models.generateContent({
    model: MODEL_ID,
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA as any,
    },
  });

  const text = response.text;
  if (!text) throw new Error('Gemini returned empty response');
  const parsed = JSON.parse(text) as {
    results: Array<{
      url: string;
      isTourPage: boolean;
      confidence: number;
      suggestedTourName?: string | null;
      suggestedCity?: string | null;
      suggestedCountry?: string | null;
      notes?: string | null;
    }>;
  };

  // Build a map URL → page so we can preserve title in the result.
  const byUrl = new Map(input.pages.map((p) => [p.url, p]));

  return parsed.results.map((r) => ({
    url: r.url,
    title: byUrl.get(r.url)?.title ?? null,
    suggestedTourName: r.suggestedTourName ?? null,
    suggestedCity: r.suggestedCity ?? null,
    suggestedCountry: r.suggestedCountry ?? null,
    confidence: Math.max(0, Math.min(100, Math.round(r.confidence ?? 0))),
    isTourPage: r.isTourPage,
    geminiNotes: r.notes ?? null,
  }));
}

// Process pages in batches, with up to 3 retries per batch.
// On terminal batch failure, emits zero-confidence stub results so the user
// can still review those pages manually.
export async function classifyPages(input: ClassifyBatchInput): Promise<ClassificationResult[]> {
  const out: ClassificationResult[] = [];
  for (let i = 0; i < input.pages.length; i += GEMINI_BATCH_SIZE) {
    const batchPages = input.pages.slice(i, i + GEMINI_BATCH_SIZE);
    let lastErr: unknown = null;
    let success = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const results = await classifyBatch({ ...input, pages: batchPages });
        out.push(...results);
        success = true;
        break;
      } catch (err) {
        lastErr = err;
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    }
    if (!success) {
      console.error('[gemini] batch failed', lastErr);
      for (const p of batchPages) {
        out.push({
          url: p.url,
          title: p.title,
          suggestedTourName: null,
          suggestedCity: null,
          suggestedCountry: null,
          confidence: 0,
          isTourPage: false,
          geminiNotes: 'classification failed',
        });
      }
    }
  }
  return out;
}
```

- [ ] **Step 3: Type check + commit**

```bash
npx tsc --noEmit
git add package.json package-lock.json lib/sources/gemini.ts
git commit -m "feat(sources): add Gemini classifier wrapper"
```

---

## Task 8: State machine module

**Files:**
- Create: `lib/sources/state-machine.ts`

- [ ] **Step 1: Create the file**

```ts
// lib/sources/state-machine.ts
//
// Opportunistic state advancement. Called from the GET poll endpoint.
// Each invocation tries to advance the job by one step. Concurrent calls are
// safe: tryClaimProcessingLock ensures only one caller does the work.
import 'server-only';
import {
  getCrawlJob,
  updateCrawlJob,
  tryClaimProcessingLock,
  releaseProcessingLock,
} from './crawl-jobs';
import { releaseGlobalCrawlLock } from './crawl-lock';
import { mapSite, pollCrawl } from './firecrawl';
import { classifyPages } from './gemini';
import { PROCESSING_LOCK_TTL_MS } from './constants';

export async function advanceCrawlJob(id: string): Promise<void> {
  const job = await getCrawlJob(id);
  if (!job) return;
  if (
    job.status === 'awaiting_url_selection' ||
    job.status === 'ready_for_review' ||
    job.status === 'failed' ||
    job.status === 'archived'
  ) {
    return;
  }

  const claimed = await tryClaimProcessingLock(id, PROCESSING_LOCK_TTL_MS);
  if (!claimed) return;

  try {
    if (job.status === 'mapping') {
      const result = await mapSite(job.rootUrl);
      await updateCrawlJob(id, {
        mapResult: result,
        status: 'awaiting_url_selection',
      });
      return;
    }

    if (job.status === 'scraping') {
      if (!job.firecrawlCrawlJobId) {
        await markFailed(id, 'Missing Firecrawl crawl job ID');
        return;
      }
      const poll = await pollCrawl(job.firecrawlCrawlJobId);
      if (poll.status === 'failed') {
        await markFailed(id, poll.error ?? 'Firecrawl crawl failed');
        return;
      }
      if (poll.status === 'in_progress') return; // remain in scraping
      // completed
      await updateCrawlJob(id, {
        scrapeResult: poll.pages,
        status: 'classifying',
      });
      return;
    }

    if (job.status === 'classifying') {
      if (!job.scrapeResult) {
        await markFailed(id, 'Missing scrape result for classification');
        return;
      }
      // Classify any pages not already in classifications.
      const alreadyDone = new Set((job.classifications ?? []).map((c) => c.url));
      const toClassify = job.scrapeResult.filter((p) => !alreadyDone.has(p.url));
      if (toClassify.length === 0) {
        await updateCrawlJob(id, { status: 'ready_for_review' });
        await releaseGlobalCrawlLock(id);
        return;
      }
      const newResults = await classifyPages({
        pages: toClassify,
        defaultCity: job.defaultCity,
        defaultCountry: job.defaultCountry,
        providerName: job.providerName,
      });
      const merged = [...(job.classifications ?? []), ...newResults];
      await updateCrawlJob(id, {
        classifications: merged,
        status: 'ready_for_review',
        costEstimate: {
          pagesScraped: job.scrapeResult.length,
          geminiTokens: 0, // SDK doesn't always return usage; left at 0 unless we wire it up later
        },
      });
      await releaseGlobalCrawlLock(id);
      return;
    }
  } catch (err) {
    console.error('[sources] advanceCrawlJob failed', err);
    await markFailed(id, err instanceof Error ? err.message : 'Unknown error');
  } finally {
    await releaseProcessingLock(id);
  }
}

async function markFailed(id: string, message: string): Promise<void> {
  await updateCrawlJob(id, { status: 'failed', error: message });
  await releaseGlobalCrawlLock(id);
}
```

- [ ] **Step 2: Type check + commit**

```bash
npx tsc --noEmit
git add lib/sources/state-machine.ts
git commit -m "feat(sources): add crawl state machine"
```

---

## Task 9: API — POST /api/sources/crawls (submit) + GET (list)

**Files:**
- Create: `app/api/sources/crawls/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { errorResponse } from '@/lib/api-errors';
import { createCrawlJob, listCrawlJobs } from '@/lib/sources/crawl-jobs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const includeArchived = req.nextUrl.searchParams.get('archived') === 'true';
  try {
    const jobs = await listCrawlJobs({ includeArchived });
    return NextResponse.json({ jobs });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await req.json()) as {
    rootUrl?: string;
    providerName?: string;
    defaultCountry?: string;
    defaultCity?: string;
  };

  const rootUrl = body.rootUrl?.trim();
  const providerName = body.providerName?.trim();
  const defaultCountry = body.defaultCountry?.trim();
  const defaultCity = body.defaultCity?.trim();

  if (!rootUrl) return NextResponse.json({ error: 'rootUrl is required' }, { status: 400 });
  if (!providerName) return NextResponse.json({ error: 'providerName is required' }, { status: 400 });
  if (!defaultCountry) return NextResponse.json({ error: 'defaultCountry is required' }, { status: 400 });
  if (!defaultCity) return NextResponse.json({ error: 'defaultCity is required' }, { status: 400 });

  try {
    new URL(rootUrl); // throws on invalid
  } catch {
    return NextResponse.json({ error: 'rootUrl must be a valid URL' }, { status: 400 });
  }

  try {
    const job = await createCrawlJob({
      rootUrl,
      providerName,
      defaultCountry,
      defaultCity,
      submittedBy: session.user.email,
    });
    return NextResponse.json({ id: job._id, status: job.status }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 2: Build + smoke check**

Run:
```bash
npx tsc --noEmit
npm run build
```
Expected: build succeeds.

Manual smoke:
```bash
# In a separate terminal with `npm run dev` running, after signing in:
curl -X POST http://localhost:3000/api/sources/crawls \
  -H "Content-Type: application/json" \
  -H "Cookie: <auth cookie from browser>" \
  -d '{"rootUrl":"https://example.com","providerName":"Example","defaultCountry":"Italy","defaultCity":"Rome"}'
```
Expected: `{"id":"...","status":"mapping"}` (or `Forbidden` if non-admin, or `Unauthorized` if no cookie).

- [ ] **Step 3: Commit**

```bash
git add app/api/sources/crawls/route.ts
git commit -m "feat(sources): add POST/GET crawls endpoints"
```

---

## Task 10: API — GET /api/sources/crawls/[id] (poll/advance) + DELETE (archive)

**Files:**
- Create: `app/api/sources/crawls/[id]/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { errorResponse } from '@/lib/api-errors';
import { getCrawlJob, archiveCrawlJob } from '@/lib/sources/crawl-jobs';
import { advanceCrawlJob } from '@/lib/sources/state-machine';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  try {
    // Fire-and-await: advance state if possible. Errors inside advance are
    // logged and turn the job's status into 'failed' — they don't bubble out.
    await advanceCrawlJob(id);
    const job = await getCrawlJob(id);
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(job);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  try {
    const result = await archiveCrawlJob(id);
    if (result === 'not_found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 2: Type check + build**

```bash
npx tsc --noEmit
npm run build
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/api/sources/crawls/[id]/route.ts
git commit -m "feat(sources): add GET/DELETE crawl detail endpoint"
```

---

## Task 11: API — POST /api/sources/crawls/[id]/scrape

**Files:**
- Create: `app/api/sources/crawls/[id]/scrape/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { errorResponse } from '@/lib/api-errors';
import { getCrawlJob, updateCrawlJob } from '@/lib/sources/crawl-jobs';
import { tryAcquireGlobalCrawlLock, releaseGlobalCrawlLock } from '@/lib/sources/crawl-lock';
import { startCrawl } from '@/lib/sources/firecrawl';
import { MAX_PAGES_PER_CRAWL } from '@/lib/sources/constants';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json()) as { selectedUrls?: string[] };
  const urls = Array.isArray(body.selectedUrls) ? body.selectedUrls : [];

  if (urls.length === 0) {
    return NextResponse.json({ error: 'selectedUrls is required and non-empty' }, { status: 400 });
  }
  if (urls.length > MAX_PAGES_PER_CRAWL) {
    return NextResponse.json(
      { error: `Cannot scrape more than ${MAX_PAGES_PER_CRAWL} URLs` },
      { status: 400 },
    );
  }

  try {
    const job = await getCrawlJob(id);
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (job.status !== 'awaiting_url_selection') {
      return NextResponse.json(
        { error: `Cannot start scrape from status ${job.status}` },
        { status: 409 },
      );
    }

    const lock = await tryAcquireGlobalCrawlLock(id);
    if (!lock.ok) {
      return NextResponse.json(
        { error: 'Another crawl is in progress', heldBy: lock.heldBy },
        { status: 409 },
      );
    }

    let firecrawlJobId: string;
    try {
      firecrawlJobId = await startCrawl(urls);
    } catch (err) {
      await releaseGlobalCrawlLock(id);
      throw err;
    }

    await updateCrawlJob(id, {
      selectedUrls: urls,
      firecrawlCrawlJobId: firecrawlJobId,
      status: 'scraping',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 2: Type check + build + commit**

```bash
npx tsc --noEmit
npm run build
git add app/api/sources/crawls/[id]/scrape/route.ts
git commit -m "feat(sources): add scrape start endpoint"
```

---

## Task 12: API — POST /api/sources/crawls/[id]/retry

**Files:**
- Create: `app/api/sources/crawls/[id]/retry/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { errorResponse } from '@/lib/api-errors';
import { getCrawlJob, updateCrawlJob } from '@/lib/sources/crawl-jobs';
import type { CrawlJobStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Retry rules:
//  - If we have classifications missing some pages → re-enter 'classifying'
//  - Else if scrapeResult exists → re-enter 'classifying' from scratch
//  - Else if firecrawlCrawlJobId exists → re-enter 'scraping' (poll same job)
//  - Else if mapResult exists → re-enter 'awaiting_url_selection'
//  - Else → re-enter 'mapping'
function nextStatusForRetry(job: {
  mapResult: unknown;
  selectedUrls: unknown;
  firecrawlCrawlJobId: unknown;
  scrapeResult: unknown;
}): CrawlJobStatus {
  if (job.scrapeResult) return 'classifying';
  if (job.firecrawlCrawlJobId) return 'scraping';
  if (job.mapResult) return 'awaiting_url_selection';
  return 'mapping';
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  try {
    const job = await getCrawlJob(id);
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (job.status !== 'failed') {
      return NextResponse.json({ error: 'Only failed jobs can be retried' }, { status: 409 });
    }
    const next = nextStatusForRetry(job);
    await updateCrawlJob(id, { status: next, error: null });
    return NextResponse.json({ success: true, status: next });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 2: Type check + commit**

```bash
npx tsc --noEmit
git add app/api/sources/crawls/[id]/retry/route.ts
git commit -m "feat(sources): add retry endpoint"
```

---

## Task 13: API — POST /api/sources/crawls/[id]/import

**Files:**
- Create: `app/api/sources/crawls/[id]/import/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { errorResponse } from '@/lib/api-errors';
import { getCrawlJob } from '@/lib/sources/crawl-jobs';
import { importSources } from '@/lib/sources/sources-store';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json()) as {
    items?: Array<{
      url: string;
      tourName: string;
      city: string;
      country: string;
      confidence: number;
    }>;
  };
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 400 });
  }

  try {
    const job = await getCrawlJob(id);
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (job.status !== 'ready_for_review') {
      return NextResponse.json(
        { error: `Cannot import from status ${job.status}` },
        { status: 409 },
      );
    }

    const cleaned = items
      .map((i) => ({
        crawlJobId: id,
        tourName: i.tourName?.trim(),
        url: i.url?.trim(),
        city: i.city?.trim(),
        country: i.country?.trim(),
        providerName: job.providerName,
        geminiConfidence: Math.max(0, Math.min(100, Math.round(i.confidence ?? 0))),
        importedBy: session.user.email!,
      }))
      .filter((i) => i.tourName && i.url && i.city && i.country);

    if (cleaned.length === 0) {
      return NextResponse.json({ error: 'No valid items to import' }, { status: 400 });
    }

    const result = await importSources(cleaned);
    return NextResponse.json({
      importedCount: result.importedCount,
      skippedCount: result.skippedCount + (items.length - cleaned.length),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 2: Type check + commit**

```bash
npx tsc --noEmit
git add app/api/sources/crawls/[id]/import/route.ts
git commit -m "feat(sources): add import endpoint"
```

---

## Task 14: API — GET /api/sources + DELETE /api/sources/[id]

**Files:**
- Create: `app/api/sources/route.ts`
- Create: `app/api/sources/[id]/route.ts`

- [ ] **Step 1: Create the list route**

```ts
// app/api/sources/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/api-errors';
import { listSources } from '@/lib/sources/sources-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;
  try {
    const sources = await listSources({
      country: sp.get('country') ?? undefined,
      city: sp.get('city') ?? undefined,
      provider: sp.get('provider') ?? undefined,
      q: sp.get('q') ?? undefined,
    });
    return NextResponse.json({ sources });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 2: Create the delete route**

```ts
// app/api/sources/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { errorResponse } from '@/lib/api-errors';
import { deleteSource } from '@/lib/sources/sources-store';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  try {
    const result = await deleteSource(id);
    if (result === 'not_found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
```

- [ ] **Step 3: Type check + commit**

```bash
npx tsc --noEmit
git add app/api/sources/route.ts app/api/sources/[id]/route.ts
git commit -m "feat(sources): add imported sources list/delete endpoints"
```

---

## Task 15: SWR polling hook

**Files:**
- Create: `lib/hooks/use-crawl-job.ts`
- Create: `lib/hooks/use-imported-sources.ts`

- [ ] **Step 1: Create the polling hook**

```ts
// lib/hooks/use-crawl-job.ts
'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { CrawlJob } from '@/lib/types';

const TERMINAL: CrawlJob['status'][] = ['ready_for_review', 'failed', 'archived', 'awaiting_url_selection'];

export function useCrawlJob(id: string | null) {
  return useSWR<CrawlJob>(id ? `/api/sources/crawls/${id}` : null, fetcher, {
    refreshInterval: (data) => {
      if (!data) return 3000;
      return TERMINAL.includes(data.status) ? 0 : 3000;
    },
    revalidateOnFocus: false,
  });
}
```

- [ ] **Step 2: Create the imported-sources hook**

```ts
// lib/hooks/use-imported-sources.ts
'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { Source } from '@/lib/types';

export interface SourcesQuery {
  q?: string;
  country?: string;
  city?: string;
  provider?: string;
}

export function useImportedSources(query: SourcesQuery) {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.country) params.set('country', query.country);
  if (query.city) params.set('city', query.city);
  if (query.provider) params.set('provider', query.provider);
  const qs = params.toString();
  return useSWR<{ sources: Source[] }>(`/api/sources${qs ? `?${qs}` : ''}`, fetcher);
}
```

- [ ] **Step 3: Type check + commit**

```bash
npx tsc --noEmit
git add lib/hooks/use-crawl-job.ts lib/hooks/use-imported-sources.ts
git commit -m "feat(sources): add SWR hooks"
```

---

## Task 16: Add Slider UI primitive

**Files:**
- Modify: `package.json` (add `@radix-ui/react-slider`)
- Create: `components/ui/slider.tsx`

- [ ] **Step 1: Install the primitive**

```bash
npm install @radix-ui/react-slider
```

- [ ] **Step 2: Create the wrapper**

This matches the shadcn/ui slider pattern that the rest of the codebase uses for Radix primitives.

```tsx
// components/ui/slider.tsx
'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

export const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn('relative flex w-full touch-none select-none items-center', className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-[hsl(var(--surface))]">
      <SliderPrimitive.Range className="absolute h-full bg-[hsl(var(--text-primary))]" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className={cn(
        'block h-4 w-4 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--text-primary))]',
        'disabled:pointer-events-none disabled:opacity-50',
      )}
    />
  </SliderPrimitive.Root>
));
Slider.displayName = 'Slider';
```

- [ ] **Step 3: Type check + commit**

```bash
npx tsc --noEmit
git add package.json package-lock.json components/ui/slider.tsx
git commit -m "feat(ui): add slider primitive"
```

---

## Task 17: New Crawl dialog

**Files:**
- Create: `app/(app)/sources/new-crawl-dialog.tsx`

- [ ] **Step 1: Create the dialog**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ComboboxInput } from '@/components/ui/combobox-input';

export function NewCrawlDialog({
  countries,
  cities,
  trigger,
}: {
  countries: string[];
  cities: string[];
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rootUrl, setRootUrl] = useState('');
  const [providerName, setProviderName] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!rootUrl || !providerName || !country || !city) {
      toast.error('All fields are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/sources/crawls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rootUrl,
          providerName,
          defaultCountry: country,
          defaultCity: city,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to start crawl');
      }
      const data = (await res.json()) as { id: string };
      setOpen(false);
      router.push(`/sources/crawls/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start crawl');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Crawl</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="root-url">Root URL</Label>
            <Input
              id="root-url"
              value={rootUrl}
              onChange={(e) => setRootUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="provider">Provider name</Label>
            <Input
              id="provider"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder="Rome Tourist Office"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="country">Default country</Label>
            <ComboboxInput
              id="country"
              value={country}
              onChange={setCountry}
              options={countries}
              placeholder="Italy"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">Default city</Label>
            <ComboboxInput
              id="city"
              value={city}
              onChange={setCity}
              options={cities}
              placeholder="Rome"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Starting...' : 'Start Crawl'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Type check + commit**

```bash
npx tsc --noEmit
git add app/(app)/sources/new-crawl-dialog.tsx
git commit -m "feat(sources): add new-crawl dialog"
```

---

## Task 18: Imported Sources list component

**Files:**
- Create: `app/(app)/sources/imported-sources-list.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useState } from 'react';
import { ExternalLink, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useImportedSources } from '@/lib/hooks/use-imported-sources';

function confidenceVariant(c: number): 'default' | 'secondary' | 'outline' {
  if (c >= 80) return 'default';
  if (c >= 60) return 'secondary';
  return 'outline';
}

export function ImportedSourcesList({ isAdmin }: { isAdmin: boolean }) {
  const [q, setQ] = useState('');
  const { data, isLoading, error } = useImportedSources({ q });
  const { mutate } = useSWRConfig();

  async function handleDelete(id: string) {
    if (!confirm('Delete this source?')) return;
    try {
      const res = await fetch(`/api/sources/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Deleted');
      // Revalidate every cached sources query.
      mutate((key) => typeof key === 'string' && key.startsWith('/api/sources'), undefined, {
        revalidate: true,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-[hsl(var(--text-tertiary))]" strokeWidth={1.5} />
        <Input
          placeholder="Search by tour name or URL..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
      </div>
      {error && <p className="text-sm text-red-500">{error.message}</p>}
      {isLoading && <p className="text-sm text-[hsl(var(--text-tertiary))]">Loading...</p>}
      {data && data.sources.length === 0 && (
        <p className="text-sm text-[hsl(var(--text-tertiary))]">No imported sources yet.</p>
      )}
      {data && data.sources.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {data.sources.map((s) => (
            <div
              key={s._id}
              className="flex items-center gap-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2"
            >
              <Badge variant={confidenceVariant(s.geminiConfidence)}>
                {s.geminiConfidence}
              </Badge>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-sm font-medium">{s.tourName}</p>
                <p className="truncate text-xs text-[hsl(var(--text-tertiary))]">
                  {s.providerName} · {s.city}, {s.country}
                </p>
              </div>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-[hsl(var(--surface))]"
                title="Open source URL"
              >
                <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
              </a>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(s._id)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type check + commit**

```bash
npx tsc --noEmit
git add app/(app)/sources/imported-sources-list.tsx
git commit -m "feat(sources): add imported sources list"
```

---

## Task 19: Crawl history list component

**Files:**
- Create: `app/(app)/sources/crawl-history-list.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { fetcher } from '@/lib/fetcher';
import type { CrawlJobSummary, CrawlJobStatus } from '@/lib/types';

function statusVariant(status: CrawlJobStatus): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'failed') return 'destructive';
  if (status === 'ready_for_review') return 'default';
  if (status === 'archived') return 'outline';
  return 'secondary';
}

function statusLabel(status: CrawlJobStatus): string {
  return status.replace(/_/g, ' ');
}

export function CrawlHistoryList() {
  const [showArchived, setShowArchived] = useState(false);
  const url = `/api/sources/crawls${showArchived ? '?archived=true' : ''}`;
  const { data, isLoading, error } = useSWR<{ jobs: CrawlJobSummary[] }>(url, fetcher);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Switch id="archived" checked={showArchived} onCheckedChange={setShowArchived} />
        <Label htmlFor="archived" className="text-xs">
          Show archived
        </Label>
      </div>
      {error && <p className="text-sm text-red-500">{error.message}</p>}
      {isLoading && <p className="text-sm text-[hsl(var(--text-tertiary))]">Loading...</p>}
      {data && data.jobs.length === 0 && (
        <p className="text-sm text-[hsl(var(--text-tertiary))]">No crawls yet.</p>
      )}
      {data && data.jobs.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {data.jobs.map((j) => (
            <Link
              key={j._id}
              href={`/sources/crawls/${j._id}`}
              className="flex items-center gap-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 hover:bg-[hsl(var(--surface))]"
            >
              <Badge variant={statusVariant(j.status)}>{statusLabel(j.status)}</Badge>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-sm font-medium">{j.providerName}</p>
                <p className="truncate text-xs text-[hsl(var(--text-tertiary))]">{j.rootUrl}</p>
              </div>
              <p className="text-xs text-[hsl(var(--text-tertiary))]">
                {j.candidateCount} candidates · {j.importedCount} imported
              </p>
              <p className="text-xs text-[hsl(var(--text-tertiary))]">
                {new Date(j.submittedAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type check + commit**

```bash
npx tsc --noEmit
git add app/(app)/sources/crawl-history-list.tsx
git commit -m "feat(sources): add crawl history list"
```

---

## Task 20: Sources index page wiring

**Files:**
- Modify: `app/(app)/sources/page.tsx`
- Create: `app/(app)/sources/sources-index-client.tsx`

This page reads existing TourProduct countries/cities (so the New Crawl combobox is seeded with the same options used elsewhere). The existing filters route (`/api/filters`) supplies them.

- [ ] **Step 1: Replace the page**

```tsx
// app/(app)/sources/page.tsx
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { SourcesIndexClient } from './sources-index-client';

export default async function SourcesPage() {
  const session = await auth();
  const email = session?.user?.email ?? '';
  const admin = email ? await isAdmin(email) : false;
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Sources</h1>
      <SourcesIndexClient isAdmin={admin} />
    </div>
  );
}
```

- [ ] **Step 2: Create the client**

```tsx
// app/(app)/sources/sources-index-client.tsx
'use client';

import useSWR from 'swr';
import { Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/fetcher';
import type { FiltersResponse } from '@/lib/types';
import { ImportedSourcesList } from './imported-sources-list';
import { CrawlHistoryList } from './crawl-history-list';
import { NewCrawlDialog } from './new-crawl-dialog';

export function SourcesIndexClient({ isAdmin }: { isAdmin: boolean }) {
  const { data: filters } = useSWR<FiltersResponse>('/api/filters', fetcher);
  const countries = filters?.countries ?? [];
  const cities = filters?.cities ?? [];

  return (
    <Tabs defaultValue="imported" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="imported">Imported Sources</TabsTrigger>
          <TabsTrigger value="history">Crawl History</TabsTrigger>
        </TabsList>
        {isAdmin && (
          <NewCrawlDialog
            countries={countries}
            cities={cities}
            trigger={
              <Button size="sm">
                <Plus className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} />
                New Crawl
              </Button>
            }
          />
        )}
      </div>
      <TabsContent value="imported">
        <ImportedSourcesList isAdmin={isAdmin} />
      </TabsContent>
      <TabsContent value="history">
        <CrawlHistoryList />
      </TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 3: Build + browser smoke**

```bash
npm run build
```
Expected: PASS.

Open `/sources` in the browser. Expected:
- Both tabs render.
- Admin sees `New Crawl` button; non-admin doesn't.
- Both tabs show empty states when no data.

- [ ] **Step 4: Commit**

```bash
git add app/(app)/sources/page.tsx app/(app)/sources/sources-index-client.tsx
git commit -m "feat(sources): wire up sources index page"
```

---

## Task 21: Crawl detail — page route + status switcher

**Files:**
- Create: `app/(app)/sources/crawls/[id]/page.tsx`
- Create: `app/(app)/sources/crawls/[id]/in-progress-card.tsx`
- Create: `app/(app)/sources/crawls/[id]/crawl-detail-client.tsx`

- [ ] **Step 1: Create the page (server)**

```tsx
// app/(app)/sources/crawls/[id]/page.tsx
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { CrawlDetailClient } from './crawl-detail-client';

export default async function CrawlDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const email = session?.user?.email ?? '';
  const admin = email ? await isAdmin(email) : false;
  return <CrawlDetailClient id={id} isAdmin={admin} />;
}
```

- [ ] **Step 2: Create the in-progress card**

```tsx
// app/(app)/sources/crawls/[id]/in-progress-card.tsx
'use client';

const COPY: Record<string, { title: string; subtitle: string }> = {
  mapping: {
    title: 'Discovering URLs...',
    subtitle: 'Firecrawl is enumerating the URLs on this site.',
  },
  scraping: {
    title: 'Scraping selected pages...',
    subtitle: 'Firecrawl is fetching content from the URLs you picked. This can take a few minutes.',
  },
  classifying: {
    title: 'Classifying tours...',
    subtitle: 'Gemini is reading the scraped pages and scoring each one.',
  },
};

export function InProgressCard({ status }: { status: 'mapping' | 'scraping' | 'classifying' }) {
  const c = COPY[status];
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[hsl(var(--border))] py-12">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[hsl(var(--text-tertiary))] border-t-transparent" />
      <p className="text-sm font-medium">{c.title}</p>
      <p className="text-xs text-[hsl(var(--text-tertiary))]">{c.subtitle}</p>
    </div>
  );
}
```

- [ ] **Step 3: Create the status switcher**

This file imports `UrlSelection` and `CandidatesTable` which we'll add in the next two tasks. For this task, render placeholders for those two states so the file type-checks; we replace the placeholders in tasks 22 and 23.

```tsx
// app/(app)/sources/crawls/[id]/crawl-detail-client.tsx
'use client';

import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCrawlJob } from '@/lib/hooks/use-crawl-job';
import { InProgressCard } from './in-progress-card';
// Stubs until tasks 22 and 23 land:
function UrlSelectionStub() {
  return <p className="text-sm text-[hsl(var(--text-tertiary))]">URL selection (task 22)</p>;
}
function CandidatesTableStub() {
  return <p className="text-sm text-[hsl(var(--text-tertiary))]">Candidates table (task 23)</p>;
}

export function CrawlDetailClient({ id, isAdmin }: { id: string; isAdmin: boolean }) {
  const { data: job, error, isLoading, mutate } = useCrawlJob(id);

  async function handleRetry() {
    try {
      const res = await fetch(`/api/sources/crawls/${id}/retry`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Retry failed');
      }
      toast.success('Retrying...');
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Retry failed');
    }
  }

  if (isLoading || !job) {
    return <p className="text-sm text-[hsl(var(--text-tertiary))]">Loading...</p>;
  }
  if (error) {
    return <p className="text-sm text-red-500">{error.message}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/sources" className="flex w-fit items-center gap-1 text-xs text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))]">
        <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
        Back to Sources
      </Link>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{job.providerName}</h1>
            <Badge variant="secondary">{job.status.replace(/_/g, ' ')}</Badge>
          </div>
          <a
            href={job.rootUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[hsl(var(--text-tertiary))] hover:underline"
          >
            {job.rootUrl}
          </a>
        </div>
      </div>

      {(job.status === 'mapping' ||
        job.status === 'scraping' ||
        job.status === 'classifying') && <InProgressCard status={job.status} />}

      {job.status === 'awaiting_url_selection' && <UrlSelectionStub />}
      {job.status === 'ready_for_review' && <CandidatesTableStub />}

      {job.status === 'failed' && (
        <div className="flex flex-col items-start gap-2 rounded-md border border-red-500/30 bg-red-500/5 p-4">
          <p className="text-sm font-medium text-red-500">Crawl failed</p>
          <p className="text-xs text-[hsl(var(--text-tertiary))]">{job.error ?? 'Unknown error'}</p>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} />
              Retry
            </Button>
          )}
        </div>
      )}

      {job.status === 'archived' && (
        <p className="text-sm text-[hsl(var(--text-tertiary))]">This crawl is archived.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add "app/(app)/sources/crawls"
git commit -m "feat(sources): add crawl detail page with status switcher"
```

---

## Task 22: URL selection step

**Files:**
- Create: `app/(app)/sources/crawls/[id]/url-selection.tsx`
- Modify: `app/(app)/sources/crawls/[id]/crawl-detail-client.tsx` (replace `UrlSelectionStub`)

- [ ] **Step 1: Create the URL selection component**

```tsx
// app/(app)/sources/crawls/[id]/url-selection.tsx
'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

const TOUR_HINTS = ['/tour', '/experience', '/excursion', '/visit', '/activity'];
const MAX = 500;

function isLikelyTour(url: string): boolean {
  const lower = url.toLowerCase();
  return TOUR_HINTS.some((h) => lower.includes(h));
}

export function UrlSelection({
  jobId,
  urls,
  onStarted,
}: {
  jobId: string;
  urls: string[];
  onStarted: () => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(urls.filter(isLikelyTour)),
  );
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return urls;
    const q = query.toLowerCase();
    return urls.filter((u) => u.toLowerCase().includes(q));
  }, [urls, query]);

  function toggle(url: string) {
    const next = new Set(selected);
    if (next.has(url)) next.delete(url);
    else next.add(url);
    setSelected(next);
  }

  function selectAllVisible() {
    const next = new Set(selected);
    for (const u of filtered) next.add(u);
    setSelected(next);
  }

  function deselectAllVisible() {
    const next = new Set(selected);
    for (const u of filtered) next.delete(u);
    setSelected(next);
  }

  async function handleStart() {
    if (selected.size === 0) {
      toast.error('Select at least one URL');
      return;
    }
    if (selected.size > MAX) {
      toast.error(`Cannot scrape more than ${MAX} URLs`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sources/crawls/${jobId}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedUrls: Array.from(selected) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to start scrape');
      }
      onStarted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start scrape');
    } finally {
      setSubmitting(false);
    }
  }

  const overLimit = selected.size > MAX;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-[hsl(var(--text-tertiary))]" strokeWidth={1.5} />
          <Input
            placeholder="Filter URLs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectAllVisible}>
            Select all visible
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAllVisible}>
            Deselect all visible
          </Button>
        </div>
      </div>
      <p className={`text-xs ${overLimit ? 'text-red-500' : 'text-[hsl(var(--text-tertiary))]'}`}>
        Selected: {selected.size} / {MAX}
      </p>
      <ScrollArea className="h-[480px] rounded-md border border-[hsl(var(--border))]">
        <div className="flex flex-col">
          {filtered.map((u) => (
            <label
              key={u}
              className="flex cursor-pointer items-center gap-2 border-b border-[hsl(var(--border))] px-3 py-2 hover:bg-[hsl(var(--surface))] last:border-b-0"
            >
              <Checkbox
                checked={selected.has(u)}
                onCheckedChange={() => toggle(u)}
              />
              <span className="truncate text-xs">{u}</span>
            </label>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-sm text-[hsl(var(--text-tertiary))]">
              No URLs match this filter.
            </p>
          )}
        </div>
      </ScrollArea>
      <div className="flex justify-end">
        <Button onClick={handleStart} disabled={submitting || selected.size === 0 || overLimit}>
          {submitting ? 'Starting...' : `Start Scrape (${selected.size})`}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the status switcher**

In `app/(app)/sources/crawls/[id]/crawl-detail-client.tsx`:
- Replace the `UrlSelectionStub` import and stub function with:
```tsx
import { UrlSelection } from './url-selection';
```
- Replace `{job.status === 'awaiting_url_selection' && <UrlSelectionStub />}` with:
```tsx
{job.status === 'awaiting_url_selection' && (
  <UrlSelection
    jobId={id}
    urls={job.mapResult?.urls ?? []}
    onStarted={() => mutate()}
  />
)}
```

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add "app/(app)/sources/crawls/[id]/url-selection.tsx" "app/(app)/sources/crawls/[id]/crawl-detail-client.tsx"
git commit -m "feat(sources): add URL selection step"
```

---

## Task 23: Candidates review table

**Files:**
- Create: `app/(app)/sources/crawls/[id]/candidates-table.tsx`
- Modify: `app/(app)/sources/crawls/[id]/crawl-detail-client.tsx` (replace `CandidatesTableStub`)

- [ ] **Step 1: Create the candidates table**

```tsx
// app/(app)/sources/crawls/[id]/candidates-table.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { ExternalLink, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ComboboxInput } from '@/components/ui/combobox-input';
import { fetcher } from '@/lib/fetcher';
import type { CrawlJob, ClassificationResult, FiltersResponse, Source } from '@/lib/types';

const DEFAULT_THRESHOLD = 75;

interface RowState {
  selected: boolean;
  tourName: string;
  city: string;
  country: string;
  manualOverride: boolean; // user toggled selection — don't let slider change it
}

function confidenceColor(c: number): string {
  if (c >= 80) return 'bg-green-500/15 text-green-700 dark:text-green-400';
  if (c >= 60) return 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
  return 'bg-[hsl(var(--surface))] text-[hsl(var(--text-tertiary))]';
}

export function CandidatesTable({
  job,
  onImported,
}: {
  job: CrawlJob;
  onImported: () => void;
}) {
  const { data: filters } = useSWR<FiltersResponse>('/api/filters', fetcher);
  const { data: imported, mutate: mutateImported } = useSWR<{ sources: Source[] }>(
    `/api/sources?provider=${encodeURIComponent(job.providerName)}`,
    fetcher,
  );
  const importedKeys = useMemo(() => {
    const set = new Set<string>();
    for (const s of imported?.sources ?? []) {
      if (s.crawlJobId === job._id) set.add(s.tourName);
    }
    return set;
  }, [imported, job._id]);

  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rowsByUrl, setRowsByUrl] = useState<Record<string, RowState>>(() =>
    initRows(job.classifications ?? [], DEFAULT_THRESHOLD, job),
  );

  // When threshold changes, update selection for rows the user hasn't manually overridden.
  useEffect(() => {
    setRowsByUrl((prev) => {
      const next = { ...prev };
      for (const c of job.classifications ?? []) {
        const r = next[c.url];
        if (r && !r.manualOverride) {
          next[c.url] = { ...r, selected: c.confidence >= threshold };
        }
      }
      return next;
    });
  }, [threshold, job.classifications]);

  const visible = useMemo(() => {
    const items = job.classifications ?? [];
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (c) =>
        c.url.toLowerCase().includes(q) ||
        (c.suggestedTourName ?? '').toLowerCase().includes(q),
    );
  }, [job.classifications, query]);

  function updateRow(url: string, patch: Partial<RowState>) {
    setRowsByUrl((prev) => ({
      ...prev,
      [url]: { ...prev[url], ...patch },
    }));
  }

  function toggleSelected(url: string) {
    setRowsByUrl((prev) => {
      const r = prev[url];
      return {
        ...prev,
        [url]: { ...r, selected: !r.selected, manualOverride: true },
      };
    });
  }

  const selectedCount = Object.values(rowsByUrl).filter(
    (r, i) => r.selected && !importedKeys.has(r.tourName),
  ).length;

  async function handleImport() {
    const items = (job.classifications ?? [])
      .filter((c) => {
        const r = rowsByUrl[c.url];
        return r?.selected && !importedKeys.has(r.tourName);
      })
      .map((c) => {
        const r = rowsByUrl[c.url];
        return {
          url: c.url,
          tourName: r.tourName,
          city: r.city,
          country: r.country,
          confidence: c.confidence,
        };
      });

    if (items.length === 0) {
      toast.error('Select at least one row to import');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/sources/crawls/${job._id}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Import failed');
      }
      const data = (await res.json()) as { importedCount: number; skippedCount: number };
      toast.success(
        `Imported ${data.importedCount}${data.skippedCount > 0 ? ` (${data.skippedCount} skipped)` : ''}`,
      );
      // Revalidate so newly-imported rows immediately show as imported.
      mutateImported();
      onImported();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-[hsl(var(--text-tertiary))]" strokeWidth={1.5} />
          <Input
            placeholder="Filter candidates..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <div className="flex flex-1 items-center gap-3 max-w-md">
          <span className="text-xs text-[hsl(var(--text-tertiary))] whitespace-nowrap">
            Confidence ≥ {threshold}
          </span>
          <Slider
            value={[threshold]}
            min={0}
            max={100}
            step={5}
            onValueChange={(v) => setThreshold(v[0])}
          />
        </div>
        <Button onClick={handleImport} disabled={submitting || selectedCount === 0}>
          {submitting ? 'Importing...' : `Import ${selectedCount} selected`}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border border-[hsl(var(--border))]">
        <table className="w-full text-sm">
          <thead className="bg-[hsl(var(--surface))] text-xs">
            <tr>
              <th className="w-8 p-2"></th>
              <th className="w-16 p-2 text-left">Score</th>
              <th className="p-2 text-left">Tour name</th>
              <th className="p-2 text-left">URL</th>
              <th className="p-2 text-left">City</th>
              <th className="p-2 text-left">Country</th>
              <th className="p-2 text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => {
              const r = rowsByUrl[c.url];
              if (!r) return null;
              const alreadyImported = importedKeys.has(r.tourName);
              return (
                <tr
                  key={c.url}
                  className={`border-t border-[hsl(var(--border))] ${alreadyImported ? 'opacity-60' : ''}`}
                >
                  <td className="p-2">
                    <Checkbox
                      checked={r.selected}
                      onCheckedChange={() => toggleSelected(c.url)}
                      disabled={alreadyImported}
                    />
                  </td>
                  <td className="p-2">
                    <Badge className={confidenceColor(c.confidence)}>{c.confidence}</Badge>
                  </td>
                  <td className="p-2">
                    <Input
                      value={r.tourName}
                      onChange={(e) => updateRow(c.url, { tourName: e.target.value })}
                      disabled={alreadyImported}
                      className="h-7"
                    />
                  </td>
                  <td className="max-w-xs p-2">
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 truncate text-xs text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))]"
                      title={c.url}
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                      <span className="truncate">{c.url}</span>
                    </a>
                  </td>
                  <td className="p-2 min-w-[160px]">
                    <ComboboxInput
                      value={r.city}
                      onChange={(v) => updateRow(c.url, { city: v })}
                      options={filters?.cities ?? []}
                    />
                  </td>
                  <td className="p-2 min-w-[160px]">
                    <ComboboxInput
                      value={r.country}
                      onChange={(v) => updateRow(c.url, { country: v })}
                      options={filters?.countries ?? []}
                    />
                  </td>
                  <td className="max-w-xs p-2">
                    <p
                      className="truncate text-xs text-[hsl(var(--text-tertiary))]"
                      title={c.geminiNotes ?? ''}
                    >
                      {c.geminiNotes ?? ''}
                    </p>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-sm text-[hsl(var(--text-tertiary))]">
                  No candidates match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function initRows(
  classifications: ClassificationResult[],
  threshold: number,
  job: CrawlJob,
): Record<string, RowState> {
  const out: Record<string, RowState> = {};
  for (const c of classifications) {
    out[c.url] = {
      selected: c.confidence >= threshold,
      tourName: c.suggestedTourName ?? c.title ?? '',
      city: c.suggestedCity ?? job.defaultCity,
      country: c.suggestedCountry ?? job.defaultCountry,
      manualOverride: false,
    };
  }
  return out;
}
```

- [ ] **Step 2: Wire it into the status switcher**

In `app/(app)/sources/crawls/[id]/crawl-detail-client.tsx`:
- Replace the `CandidatesTableStub` import/function with `import { CandidatesTable } from './candidates-table';`.
- Replace `{job.status === 'ready_for_review' && <CandidatesTableStub />}` with:
```tsx
{job.status === 'ready_for_review' && (
  <CandidatesTable job={job} onImported={() => mutate()} />
)}
```

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add "app/(app)/sources/crawls/[id]/candidates-table.tsx" "app/(app)/sources/crawls/[id]/crawl-detail-client.tsx"
git commit -m "feat(sources): add candidates review table"
```

---

## Task 24: Document env vars

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add env vars to the documented block**

In `CLAUDE.md`, find the `## Environment Variables` section and append two lines after `GOOGLE_PRIVATE_KEY=`:

```env
FIRECRAWL_API_KEY=                         # Sources page: Firecrawl /map + /crawl
GEMINI_API_KEY=                            # Sources page: Gemini 2.5 Flash classification
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document FIRECRAWL_API_KEY and GEMINI_API_KEY"
```

---

## Task 25: End-to-end manual verification

This task has no code — only verification steps. Skip the commit at the end (nothing to commit).

- [ ] **Step 1: Set env vars locally**

Add `FIRECRAWL_API_KEY` and `GEMINI_API_KEY` to `.env.local`. Run `npm run dev`.

- [ ] **Step 2: Sign in as an admin**

Confirm the New Crawl button is visible on `/sources`.

- [ ] **Step 3: Submit a small site crawl**

Pick a small tour-site (e.g., a single-tour boutique provider, < 50 pages). Fill in the form and submit. Expected:
- Page navigates to `/sources/crawls/<id>`.
- Card shows "Discovering URLs...".
- Within ~30s, the URL list appears with the tour-heuristic URLs pre-checked.

- [ ] **Step 4: Start scrape**

Confirm the URL list is reasonable. Click `Start Scrape`. Expected:
- Card transitions to "Scraping selected pages...".
- Status badge updates from `awaiting_url_selection` → `scraping`.

- [ ] **Step 5: Wait for classification**

When scraping finishes, the page transitions to "Classifying tours...". Then to the candidates table. Expected:
- Each row has a confidence pill.
- Rows ≥ 75 confidence are pre-selected.
- Tour name, city, country are editable.

- [ ] **Step 6: Test the slider**

Drag the threshold slider. Expected:
- Rows whose confidence ≥ slider become checked; rows below become unchecked.
- Manual toggles you've made are preserved.

- [ ] **Step 7: Import**

Click `Import N selected`. Expected:
- Toast: `Imported N`.
- The Imported Sources tab on `/sources` now shows those rows.

- [ ] **Step 8: Test re-import**

Click `Import N selected` again with the same rows. Expected:
- Toast: `Imported 0 (N skipped)` — duplicates blocked.

- [ ] **Step 9: Test concurrent crawl rejection**

In another browser tab, submit a second crawl while the first is still scraping. Expected:
- The second `Start Scrape` returns 409 with "Another crawl is in progress".

- [ ] **Step 10: Test archive**

From the Crawl History tab, archive the test crawl. Expected:
- It disappears from the default list.
- Toggling `Show archived` brings it back with an `archived` badge.

If any step fails, the failure is the bug to fix in a follow-up commit. This task is "done" when all 10 steps pass.

---

## Spec coverage check

| Spec section | Implemented in task |
|---|---|
| `crawljobs` collection / `CrawlJob` type | 1, 3 |
| `sources` collection / `Source` type | 1, 5 |
| `crawljobs_lock` collection | 4 |
| Constants (caps, TTLs, batch sizes) | 2 |
| Firecrawl `/map` and `/crawl` integration | 6 |
| Gemini classification with structured output | 7 |
| State machine + opportunistic poll | 8, 10 |
| `POST /api/sources/crawls` (submit) | 9 |
| `GET /api/sources/crawls` (list) | 9 |
| `GET /api/sources/crawls/[id]` (poll/advance) | 10 |
| `DELETE /api/sources/crawls/[id]` (archive) | 10 |
| `POST /api/sources/crawls/[id]/scrape` | 11 |
| `POST /api/sources/crawls/[id]/retry` | 12 |
| `POST /api/sources/crawls/[id]/import` | 13 |
| `GET /api/sources` | 14 |
| `DELETE /api/sources/[id]` | 14 |
| SWR polling hook | 15 |
| Slider UI primitive | 16 |
| New Crawl dialog | 17 |
| Imported Sources list | 18 |
| Crawl History list | 19 |
| Sources index page (admin gating) | 20 |
| Crawl detail page + status switcher | 21 |
| URL selection step | 22 |
| Candidates table + slider + import | 23 |
| Env var documentation | 24 |
| End-to-end smoke verification | 25 |

All spec sections covered. The Sidebar nav already includes `/sources`, so no nav changes needed.
