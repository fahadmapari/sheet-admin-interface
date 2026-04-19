import 'server-only';
import { ObjectId } from 'mongodb';
import { getDb } from './mongodb';
import type { SheetLink } from './types';

const COLLECTION = 'sheetlinks';

function toSheetLink(doc: Record<string, unknown>): SheetLink {
  return {
    _id: (doc._id as ObjectId).toString(),
    name: doc.name as string,
    url: doc.url as string,
    tags: (doc.tags as string[]) ?? [],
    visibleToTeam: doc.visibleToTeam as boolean,
    createdBy: doc.createdBy as string,
    createdAt: (doc.createdAt as Date).toISOString(),
    updatedAt: (doc.updatedAt as Date).toISOString(),
  };
}

export interface CreateSheetLinkInput {
  name: string;
  url: string;
  tags: string[];
  visibleToTeam: boolean;
  createdBy: string;
}

export interface UpdateSheetLinkInput {
  name?: string;
  url?: string;
  tags?: string[];
  visibleToTeam?: boolean;
}

function buildSearchFilter(query?: string) {
  if (!query?.trim()) return {};
  const regex = { $regex: query.trim(), $options: 'i' };
  return { $or: [{ name: regex }, { url: regex }, { tags: regex }] };
}

export async function createSheetLink(input: CreateSheetLinkInput): Promise<SheetLink> {
  const db = await getDb();
  const now = new Date();
  const result = await db.collection(COLLECTION).insertOne({
    name: input.name,
    url: input.url,
    tags: input.tags,
    visibleToTeam: input.visibleToTeam,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  });
  // Avoids a round-trip: all fields are known from input + local vars. Update if server-side defaults are added.
  return toSheetLink({
    _id: result.insertedId,
    name: input.name,
    url: input.url,
    tags: input.tags,
    visibleToTeam: input.visibleToTeam,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  } as Record<string, unknown>);
}

export async function listSheetLinksMine(email: string, query?: string): Promise<SheetLink[]> {
  const db = await getDb();
  const filter = { createdBy: email, ...buildSearchFilter(query) };
  const docs = await db.collection(COLLECTION).find(filter).sort({ createdAt: -1 }).toArray();
  return docs.map((d) => toSheetLink(d as Record<string, unknown>));
}

export async function listSheetLinksTeam(email: string, query?: string): Promise<SheetLink[]> {
  const db = await getDb();
  const filter = { visibleToTeam: true, createdBy: { $ne: email }, ...buildSearchFilter(query) };
  const docs = await db.collection(COLLECTION).find(filter).sort({ createdAt: -1 }).toArray();
  return docs.map((d) => toSheetLink(d as Record<string, unknown>));
}

export async function updateSheetLink(
  id: string,
  email: string,
  patch: UpdateSheetLinkInput,
): Promise<'updated' | 'not_found' | 'forbidden'> {
  const db = await getDb();
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return 'not_found';
  }
  const doc = await db.collection(COLLECTION).findOne({ _id: objectId });
  if (!doc) return 'not_found';
  if (doc.createdBy !== email) return 'forbidden';
  await db.collection(COLLECTION).updateOne(
    { _id: objectId },
    { $set: { ...patch, updatedAt: new Date() } },
  );
  return 'updated';
}

export async function deleteSheetLink(
  id: string,
  email: string,
): Promise<'deleted' | 'not_found' | 'forbidden'> {
  const db = await getDb();
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return 'not_found';
  }
  const doc = await db.collection(COLLECTION).findOne({ _id: objectId });
  if (!doc) return 'not_found';
  if (doc.createdBy !== email) return 'forbidden';
  await db.collection(COLLECTION).deleteOne({ _id: objectId });
  return 'deleted';
}
