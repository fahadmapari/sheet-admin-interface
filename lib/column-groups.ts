import 'server-only';
import { getDb } from './mongodb';
import { COLUMN_GROUPS } from './constants';

export interface ColumnGroup {
  id: string;
  label: string;
  fields: string[];
}

export interface ColumnGroupsResponse {
  groups: ColumnGroup[];
  isDefault: boolean;
}

const COLLECTION = 'columngroupconfig';
const SINGLETON_ID = 'singleton';

export async function getColumnGroups(): Promise<ColumnGroupsResponse> {
  const db = await getDb();
  const doc = await (db.collection(COLLECTION) as any).findOne({ _id: SINGLETON_ID }) as
    | { groups: ColumnGroup[] }
    | null;

  if (!doc) {
    return {
      groups: COLUMN_GROUPS.map((g) => ({
        id: g.id,
        label: g.label,
        fields: [...(g.fields as readonly string[])],
      })),
      isDefault: true,
    };
  }

  return { groups: doc.groups, isDefault: false };
}

export async function saveColumnGroups(groups: ColumnGroup[]): Promise<void> {
  const db = await getDb();
  await (db.collection(COLLECTION) as any).replaceOne(
    { _id: SINGLETON_ID },
    { _id: SINGLETON_ID, groups },
    { upsert: true }
  );
}

export async function resetColumnGroups(): Promise<void> {
  const db = await getDb();
  await (db.collection(COLLECTION) as any).deleteOne({ _id: SINGLETON_ID });
}
