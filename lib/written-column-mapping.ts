import 'server-only';
import { getDb } from './mongodb';
export { colIndexToLetter, colLetterToIndex } from './column-utils';

const COLLECTION = 'writtencolumnmapping';

interface ColumnMappingDoc {
  overrides: Record<string, number>;
}

export const WRITTEN_FIELD_TO_COL: Record<string, number> = {
  country: 0,
  cityDestination: 1,
  state: 2,
  tourType: 3,
  textLink: 4,
  ccOk: 5,
  isOk: 6,
  rrOk: 7,
  ssOk: 8,
  contentExist: 9,
  b2b: 10,
  b2c: 11,
  ssNotes: 12,
};

export const WRITTEN_FIELD_LABELS: Record<string, string> = {
  country: 'Country',
  cityDestination: 'City Destination',
  state: 'State',
  tourType: 'Tour Type',
  textLink: 'Text Link',
  ccOk: 'CC OK',
  isOk: 'IS OK',
  rrOk: 'RR OK',
  ssOk: 'SS OK',
  contentExist: 'Content Exist',
  b2b: 'B2B',
  b2c: 'B2C',
  ssNotes: 'SS Notes',
};

export async function getEffectiveWrittenColumnMap(): Promise<Record<string, number>> {
  try {
    const db = await getDb();
    const doc = await db.collection<ColumnMappingDoc>(COLLECTION).findOne({});
    const overrides = doc?.overrides ?? {};
    return { ...WRITTEN_FIELD_TO_COL, ...overrides };
  } catch (err) {
    console.error('[written-column-mapping] Failed to load overrides, using defaults:', err);
    return { ...WRITTEN_FIELD_TO_COL };
  }
}

export async function saveWrittenColumnMappingOverrides(
  fullMap: Record<string, number>,
): Promise<void> {
  const overrides: Record<string, number> = {};
  for (const [field, idx] of Object.entries(fullMap)) {
    if (WRITTEN_FIELD_TO_COL[field] !== idx) {
      overrides[field] = idx;
    }
  }
  const db = await getDb();
  await db.collection<ColumnMappingDoc>(COLLECTION).replaceOne({}, { overrides }, { upsert: true });
}

export async function clearWrittenColumnMappingOverrides(): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).deleteMany({});
}
