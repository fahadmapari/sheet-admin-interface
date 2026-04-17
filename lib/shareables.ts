import 'server-only';
import { ObjectId } from 'mongodb';
import { nanoid } from 'nanoid';
import { getDb } from './mongodb';
import type { ShareableLink } from './types';
import type { Filters } from './product-filters';

const COLLECTION = 'shareablelinks';

export interface CreateShareableLinkInput {
  title: string;
  expiresAt: string | null;
  visibleToTeam: boolean;
  columns: string[];
  filters: Filters;
  createdBy: string;
}

export async function createShareableLink(input: CreateShareableLinkInput): Promise<string> {
  const db = await getDb();
  const token = nanoid(12);
  await db.collection(COLLECTION).insertOne({
    token,
    title: input.title,
    createdBy: input.createdBy,
    createdAt: new Date(),
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    visibleToTeam: input.visibleToTeam,
    columns: input.columns,
    filters: input.filters,
  });
  return token;
}

export async function getShareableLinkByToken(token: string): Promise<ShareableLink | null> {
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ token });
  if (!doc) return null;
  return {
    _id: doc._id.toString(),
    token: doc.token as string,
    title: doc.title as string,
    createdBy: doc.createdBy as string,
    createdAt: (doc.createdAt as Date).toISOString(),
    expiresAt: doc.expiresAt ? (doc.expiresAt as Date).toISOString() : null,
    visibleToTeam: doc.visibleToTeam as boolean,
    columns: doc.columns as string[],
    filters: doc.filters as Filters,
  };
}

export async function listShareableLinksMine(email: string): Promise<ShareableLink[]> {
  const db = await getDb();
  const docs = await db.collection(COLLECTION)
    .find({ createdBy: email })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((doc) => ({
    _id: doc._id.toString(),
    token: doc.token as string,
    title: doc.title as string,
    createdBy: doc.createdBy as string,
    createdAt: (doc.createdAt as Date).toISOString(),
    expiresAt: doc.expiresAt ? (doc.expiresAt as Date).toISOString() : null,
    visibleToTeam: doc.visibleToTeam as boolean,
    columns: doc.columns as string[],
    filters: doc.filters as Filters,
  }));
}

export async function listShareableLinksTeam(email: string): Promise<ShareableLink[]> {
  const db = await getDb();
  const docs = await db.collection(COLLECTION)
    .find({ visibleToTeam: true, createdBy: { $ne: email } })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((doc) => ({
    _id: doc._id.toString(),
    token: doc.token as string,
    title: doc.title as string,
    createdBy: doc.createdBy as string,
    createdAt: (doc.createdAt as Date).toISOString(),
    expiresAt: doc.expiresAt ? (doc.expiresAt as Date).toISOString() : null,
    visibleToTeam: doc.visibleToTeam as boolean,
    columns: doc.columns as string[],
    filters: doc.filters as Filters,
  }));
}

export async function deleteShareableLink(id: string, email: string): Promise<'deleted' | 'not_found' | 'forbidden'> {
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
