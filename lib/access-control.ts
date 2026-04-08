import 'server-only';
import { getDb } from './mongodb';

export interface AccessControlDoc {
  allowAll: boolean;
  allowedEmails: string[];
  adminEmails: string[];
}

const COLLECTION = 'accesscontrol';
const DEFAULT_ADMIN = 'btechy4@gmail.com';
const SINGLETON_ID = 'singleton';

let cache: { doc: AccessControlDoc; expiresAt: number } | null = null;

export async function getAccessControl(): Promise<AccessControlDoc> {
  if (cache && Date.now() < cache.expiresAt) {
    return { ...cache.doc };
  }

  const db = await getDb();
  const raw = await (db.collection(COLLECTION) as any).findOne({ _id: SINGLETON_ID }) as (AccessControlDoc & { _id: string }) | null;

  let doc: AccessControlDoc;
  if (!raw) {
    doc = { allowAll: false, allowedEmails: [], adminEmails: [DEFAULT_ADMIN] };
    await (db.collection(COLLECTION) as any).insertOne({ _id: SINGLETON_ID, ...doc });
  } else {
    doc = { allowAll: raw.allowAll, allowedEmails: raw.allowedEmails, adminEmails: raw.adminEmails };
  }

  cache = { doc, expiresAt: Date.now() + 30_000 };
  return doc;
}

export async function updateAccessControl(patch: Partial<AccessControlDoc>): Promise<AccessControlDoc> {
  const current = await getAccessControl();
  const updated: AccessControlDoc = {
    allowAll: patch.allowAll ?? current.allowAll,
    allowedEmails: patch.allowedEmails ?? current.allowedEmails,
    adminEmails: patch.adminEmails ?? current.adminEmails,
  };

  const db = await getDb();
  await (db.collection(COLLECTION) as any).replaceOne(
    { _id: SINGLETON_ID },
    { _id: SINGLETON_ID, ...updated },
    { upsert: true }
  );

  cache = null; // invalidate
  return updated;
}

export async function isAdmin(email: string): Promise<boolean> {
  const doc = await getAccessControl();
  return doc.adminEmails.includes(email);
}
