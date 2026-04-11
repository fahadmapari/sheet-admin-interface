import 'server-only';
import { FIELD_TO_COL } from './constants';
import { getDb } from './mongodb';
export { colIndexToLetter, colLetterToIndex } from './column-utils';

const COLLECTION = 'columnmapping';

interface ColumnMappingDoc {
  overrides: Record<string, number>;
}

// Returns effective field→colIndex mapping: FIELD_TO_COL defaults merged with MongoDB overrides.
// Falls back to FIELD_TO_COL if MongoDB is unavailable.
export async function getEffectiveColumnMap(): Promise<Record<string, number>> {
  try {
    const db = await getDb();
    const doc = await db.collection<ColumnMappingDoc>(COLLECTION).findOne({});
    const overrides = doc?.overrides ?? {};
    return { ...FIELD_TO_COL, ...overrides };
  } catch (err) {
    console.error('[column-mapping] Failed to load overrides, using defaults:', err);
    return { ...FIELD_TO_COL };
  }
}

// Persists the full effective mapping supplied by the caller.
// Computes the diff vs FIELD_TO_COL and stores only changed entries.
export async function saveColumnMappingOverrides(
  fullMap: Record<string, number>,
): Promise<void> {
  const overrides: Record<string, number> = {};
  for (const [field, idx] of Object.entries(fullMap)) {
    if (FIELD_TO_COL[field as keyof typeof FIELD_TO_COL] !== idx) {
      overrides[field] = idx;
    }
  }
  const db = await getDb();
  await db.collection<ColumnMappingDoc>(COLLECTION).replaceOne({}, { overrides }, { upsert: true });
}

// Removes all overrides — app reverts to FIELD_TO_COL defaults.
export async function clearColumnMappingOverrides(): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).deleteMany({});
}
