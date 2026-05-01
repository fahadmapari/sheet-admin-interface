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
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return;
  }
  const db = await getDb();
  await db.collection(COLLECTIONS.crawlJobs).updateOne(
    { _id: oid },
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
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return false;
  }
  const db = await getDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);
  const result = await db.collection(COLLECTIONS.crawlJobs).updateOne(
    {
      _id: oid,
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
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return;
  }
  const db = await getDb();
  await db.collection(COLLECTIONS.crawlJobs).updateOne(
    { _id: oid },
    { $set: { processingLockedUntil: null } },
  );
}
