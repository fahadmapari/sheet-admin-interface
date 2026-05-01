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
  const current = await (db.collection(COLLECTIONS.crawlLock) as any).findOne({
    _id: CRAWL_LOCK_SINGLETON_ID,
  });
  return { ok: false, heldBy: (current?.jobId as string) ?? 'unknown' };
}

export async function releaseGlobalCrawlLock(jobId: string): Promise<void> {
  const db = await getDb();
  await (db.collection(COLLECTIONS.crawlLock) as any).updateOne(
    { _id: CRAWL_LOCK_SINGLETON_ID, jobId },
    { $set: { jobId: null, acquiredAt: null } },
  );
}

export async function getGlobalCrawlLockHolder(): Promise<string | null> {
  const db = await getDb();
  const doc = await (db.collection(COLLECTIONS.crawlLock) as any).findOne({
    _id: CRAWL_LOCK_SINGLETON_ID,
  });
  if (!doc?.jobId) return null;
  const acquiredAt = doc.acquiredAt as Date | null;
  if (!acquiredAt) return null;
  if (Date.now() - acquiredAt.getTime() >= GLOBAL_CRAWL_LOCK_TTL_MS) return null;
  return doc.jobId as string;
}
