import 'server-only';
import { getDb } from './mongodb';

export interface AccessControlDoc {
  allowAll: boolean;
  allowedEmails: string[];
  adminEmails: string[];
}

const COLLECTION = 'accesscontrol';
const DEFAULT_ADMIN = (process.env.DEFAULT_ADMIN_EMAIL ?? 'btechy4@gmail.com').toLowerCase();
const SINGLETON_ID = 'singleton';

let cache: { doc: AccessControlDoc; expiresAt: number } | null = null;

export async function getAccessControl(): Promise<AccessControlDoc> {
  if (cache && Date.now() < cache.expiresAt) {
    return { ...cache.doc };
  }

  const db = await getDb();
  const defaults: AccessControlDoc = {
    allowAll: false,
    allowedEmails: [],
    adminEmails: [DEFAULT_ADMIN],
  };

  // Atomic upsert avoids the read-then-insert race when two requests hit the
  // empty collection concurrently.
  const result = await (db.collection(COLLECTION) as any).findOneAndUpdate(
    { _id: SINGLETON_ID },
    { $setOnInsert: { _id: SINGLETON_ID, ...defaults } },
    { upsert: true, returnDocument: 'after' },
  );
  const raw = (result?.value ?? result) as (AccessControlDoc & { _id: string }) | null;

  const doc: AccessControlDoc = raw
    ? {
        allowAll: raw.allowAll ?? defaults.allowAll,
        allowedEmails: raw.allowedEmails ?? defaults.allowedEmails,
        adminEmails: raw.adminEmails ?? defaults.adminEmails,
      }
    : defaults;

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
  return doc.adminEmails.includes(email.toLowerCase());
}
