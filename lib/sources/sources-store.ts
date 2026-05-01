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
