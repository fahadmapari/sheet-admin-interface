# Column Mapping Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Settings tab that shows the full sheet column mapping (field → letter → header) and lets admins reassign column letters, persisting overrides in MongoDB so the app immediately uses them for all reads and writes.

**Architecture:** A new `lib/column-mapping.ts` module exports `getEffectiveColumnMap()` which merges the hardcoded `FIELD_TO_COL` defaults with a MongoDB `columnmapping` override document; `rowToProduct` and `productToRow` in `lib/utils.ts` accept an optional `colMap` parameter (defaulting to `FIELD_TO_COL`) so all product API routes can pass the live mapping; a new Settings tab with a 70-row table lets admins edit column letters with inline validation.

**Tech Stack:** Next.js 14 App Router, TypeScript, MongoDB (via `getDb()`), SWR, shadcn/ui, Sonner toasts, Tailwind CSS.

> **Spec correction:** The spec document says `{ ...COLUMN_MAP, ...overrides }` but `COLUMN_MAP` is `index → field`. The correct merge base is `FIELD_TO_COL` (`field → index`), which matches the override format stored in MongoDB.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `lib/column-mapping.ts` | Letter↔index utils, MongoDB read/write, `getEffectiveColumnMap()` |
| Modify | `lib/sheets.ts` | Remove private `colIndexToLetter`, import from `lib/column-mapping.ts` |
| Modify | `lib/utils.ts` | `rowToProduct` / `productToRow` accept optional `colMap` param |
| Create | `app/api/column-mapping/route.ts` | GET / PUT / DELETE admin-protected handlers |
| Create | `lib/hooks/use-column-mapping.ts` | SWR hook for the settings UI |
| Create | `components/settings/column-mapping-settings.tsx` | Settings tab UI |
| Modify | `app/(app)/settings/page.tsx` | Add Column Mapping tab (admin-only) |
| Modify | `app/api/products/route.ts` | Use dynamic colMap for reads |
| Modify | `app/api/products/[rowIndex]/route.ts` | Use dynamic colMap for writes |
| Modify | `app/api/products/bulk/route.ts` | Use dynamic colMap for bulk writes |

---

## Task 1: Create `lib/column-mapping.ts`

**Files:**
- Create: `lib/column-mapping.ts`

- [ ] **Step 1: Create the module**

```ts
// lib/column-mapping.ts
import 'server-only';
import { FIELD_TO_COL } from './constants';
import { getDb } from './mongodb';

const COLLECTION = 'columnmapping';

// ---------------------------------------------------------------------------
// Column letter <-> index conversion (A=0, B=1, ..., Z=25, AA=26, ..., BR=69)
// ---------------------------------------------------------------------------

export function colIndexToLetter(colIndex: number): string {
  if (colIndex < 0) throw new Error('colIndex must be >= 0, received ' + colIndex);
  let letter = '';
  let n = colIndex;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

// "A" → 0, "B" → 1, "Z" → 25, "AA" → 26, "BR" → 69
export function colLetterToIndex(letter: string): number {
  const upper = letter.toUpperCase().trim();
  if (!/^[A-Z]{1,2}$/.test(upper)) throw new Error(`Invalid column letter: ${letter}`);
  let result = 0;
  for (let i = 0; i < upper.length; i++) {
    result = result * 26 + (upper.charCodeAt(i) - 64);
  }
  return result - 1;
}

// ---------------------------------------------------------------------------
// MongoDB read / write
// ---------------------------------------------------------------------------

// Returns effective field→colIndex mapping: FIELD_TO_COL defaults merged with overrides.
// Falls back to FIELD_TO_COL if MongoDB is unavailable.
export async function getEffectiveColumnMap(): Promise<Record<string, number>> {
  try {
    const db = await getDb();
    const doc = await db.collection(COLLECTION).findOne({});
    const overrides = (doc?.overrides as Record<string, number>) ?? {};
    return { ...FIELD_TO_COL, ...overrides };
  } catch {
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
  await db.collection(COLLECTION).replaceOne({}, { overrides }, { upsert: true });
}

// Removes all overrides — app reverts to FIELD_TO_COL defaults.
export async function clearColumnMappingOverrides(): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).deleteMany({});
}
```

- [ ] **Step 2: Verify letter conversion math by inspection**

Check the following manually before continuing:
- `colIndexToLetter(0)` → `"A"` ✓ (0 % 26 = 0 → 'A', loop exits after 1 iteration)
- `colIndexToLetter(25)` → `"Z"` ✓
- `colIndexToLetter(26)` → `"AA"` ✓
- `colLetterToIndex("A")` → `0` ✓ (result = 1, −1 = 0)
- `colLetterToIndex("Z")` → `25` ✓ (result = 26, −1 = 25)
- `colLetterToIndex("AA")` → `26` ✓ (result = 1→1*26+1=27, −1 = 26)
- `colLetterToIndex("BR")` → `69` ✓ (B=2, R=18 → 2*26+18=70, −1=69)

- [ ] **Step 3: Commit**

```bash
git add lib/column-mapping.ts
git commit -m "feat: add column-mapping lib with letter utils and MongoDB persistence"
```

---

## Task 2: Update `lib/sheets.ts` — remove duplicate `colIndexToLetter`

**Files:**
- Modify: `lib/sheets.ts`

- [ ] **Step 1: Replace the private function with an import**

At the top of `lib/sheets.ts`, add the import:

```ts
import { colIndexToLetter } from './column-mapping';
```

Then delete the private `colIndexToLetter` function (lines 49–58 in the current file):

```ts
// DELETE this entire block:
function colIndexToLetter(colIndex: number): string {
  if (colIndex < 0) throw new Error('colIndexToLetter: colIndex must be >= 0, received ' + colIndex);
  let letter = '';
  let n = colIndex;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}
```

- [ ] **Step 2: Start dev server and confirm no import errors**

```bash
npm run dev
```

Expected: server starts without errors. Visit http://localhost:3000/products — products table loads.

- [ ] **Step 3: Commit**

```bash
git add lib/sheets.ts
git commit -m "refactor: import colIndexToLetter from lib/column-mapping"
```

---

## Task 3: Update `lib/utils.ts` — dynamic `colMap` parameter

**Files:**
- Modify: `lib/utils.ts`

- [ ] **Step 1: Add FIELD_TO_COL import**

At the top of `lib/utils.ts`, add:

```ts
import { FIELD_TO_COL } from './constants';
```

- [ ] **Step 2: Replace `rowToProduct`**

Replace the entire `rowToProduct` function with:

```ts
export function rowToProduct(
  row: string[],
  rowIndex: number,
  linkHyperlink?: string,
  imageLinksRichText?: string,
  colMap: Record<string, number> = FIELD_TO_COL,
): TourProduct {
  const get = (field: string) => row[colMap[field as keyof typeof colMap]];
  const linkText = toText(get('link'));

  let link: string | null;
  if (linkHyperlink) {
    link = linkText && linkText !== linkHyperlink
      ? `${linkText}||${linkHyperlink}`
      : linkHyperlink;
  } else {
    link = linkText;
  }

  return {
    rowIndex,
    country: toRequiredText(get('country')),
    city: toRequiredText(get('city')),
    department: toText(get('department')),
    region: toText(get('region')),
    productType: toRequiredText(get('productType')),
    link,
    duration: toText(get('duration')),
    productStatus: toText(get('productStatus')),
    productName: toText(get('productName')),
    written: toBoolean(get('written')),
    notes: toText(get('notes')),
    isOk: toText(get('isOk')),
    ssOk: toBoolean(get('ssOk')),
    imageLinks: imageLinksRichText ?? toText(get('imageLinks')),
    maxPax: toText(get('maxPax')),
    guide: toBoolean(get('guide')),
    driver: toBoolean(get('driver')),
    driverGuide: toBoolean(get('driverGuide')),
    guideWhere: toText(get('guideWhere')),
    componentsOfTour: toText(get('componentsOfTour')),
    attractionIncluded: toBoolean(get('attractionIncluded')),
    attractionOptional: toBoolean(get('attractionOptional')),
    transportation: toText(get('transportation')),
    attractionsIncluded: toText(get('attractionsIncluded')),
    attractionLink: toText(get('attractionLink')),
    providerPrice: toText(get('providerPrice')),
    providerUrl: toText(get('providerUrl')),
    centralProviderLinks: toText(get('centralProviderLinks')),
    centralTransportLinks: toText(get('centralTransportLinks')),
    transportationPrice: toText(get('transportationPrice')),
    vatYN: toText(get('vatYN')),
    vatPercent: toNumber(get('vatPercent')),
    totalBuyingPrice: toText(get('totalBuyingPrice')),
    cancellation: toText(get('cancellation')),
    pic: toText(get('pic')),
    b2bPriceInstant: toText(get('b2bPriceInstant')),
    b2bPriceOnRequest: toText(get('b2bPriceOnRequest')),
    b2cPriceInstant: toText(get('b2cPriceInstant')),
    b2cPriceOnRequest: toText(get('b2cPriceOnRequest')),
    extraHrB2BInstant: toText(get('extraHrB2BInstant')),
    extraHrB2BRequest: toText(get('extraHrB2BRequest')),
    extraHrB2CInstant: toText(get('extraHrB2CInstant')),
    extraHrB2CRequest: toText(get('extraHrB2CRequest')),
    tourValidityGeneral: toText(get('tourValidityGeneral')),
    tourValiditySpecific: toText(get('tourValiditySpecific')),
    cancelInstant: toText(get('cancelInstant')),
    cutoffInstant: toText(get('cutoffInstant')),
    cancelOnRequest: toText(get('cancelOnRequest')),
    cutoffOnRequest: toText(get('cutoffOnRequest')),
    notesGeneral: toText(get('notesGeneral')),
    otaMasterSheet: toText(get('otaMasterSheet')),
    otaTravmonde: toText(get('otaTravmonde')),
    otaBookableTours: toText(get('otaBookableTours')),
    otaViator: toText(get('otaViator')),
    otaGyg: toText(get('otaGyg')),
    otaHotelbeds: toText(get('otaHotelbeds')),
    otaProjectExpedition: toText(get('otaProjectExpedition')),
    otaAirbnb: toText(get('otaAirbnb')),
    otaBokun: toText(get('otaBokun')),
    otaTrekksoft: toText(get('otaTrekksoft')),
    otaTuiMusement: toText(get('otaTuiMusement')),
    otaKlook: toText(get('otaKlook')),
    otaToristy: toText(get('otaToristy')),
    otaTourHQ: toText(get('otaTourHQ')),
    qualityRemarks: toText(get('qualityRemarks')),
    readyForUpload: toBoolean(get('readyForUpload')),
    uploadedPic: toText(get('uploadedPic')),
    dateOfDispatch: toText(get('dateOfDispatch')),
    dateUploaded: toText(get('dateUploaded')),
    productLink: toText(get('productLink')),
  };
}
```

- [ ] **Step 3: Replace `productToRow`**

Replace the entire `productToRow` function with:

```ts
export function productToRow(
  product: Omit<TourProduct, 'rowIndex'>,
  colMap: Record<string, number> = FIELD_TO_COL,
): string[] {
  const row = new Array(70).fill('');
  const set = (field: string, val: string | number | boolean | null | undefined) => {
    const col = colMap[field as keyof typeof colMap];
    if (col === undefined) return;
    if (val === null || val === undefined) { row[col] = ''; return; }
    if (typeof val === 'boolean') { row[col] = val ? 'TRUE' : 'FALSE'; return; }
    row[col] = String(val);
  };
  set('country', product.country);
  set('city', product.city);
  set('department', product.department);
  set('region', product.region);
  set('productType', product.productType);
  // link field: only write display text to the cell value; hyperlink is set separately
  set('link', product.link ? parseLinkField(product.link).text || parseLinkField(product.link).url : '');
  set('duration', product.duration);
  set('productStatus', product.productStatus);
  set('productName', product.productName);
  set('written', product.written);
  set('notes', product.notes);
  set('isOk', product.isOk);
  set('ssOk', product.ssOk);
  set('imageLinks', product.imageLinks);
  set('maxPax', product.maxPax);
  set('guide', product.guide);
  set('driver', product.driver);
  set('driverGuide', product.driverGuide);
  set('guideWhere', product.guideWhere);
  set('componentsOfTour', product.componentsOfTour);
  set('attractionIncluded', product.attractionIncluded);
  set('attractionOptional', product.attractionOptional);
  set('transportation', product.transportation);
  set('attractionsIncluded', product.attractionsIncluded);
  set('attractionLink', product.attractionLink);
  set('providerPrice', product.providerPrice);
  set('providerUrl', product.providerUrl);
  set('centralProviderLinks', product.centralProviderLinks);
  set('centralTransportLinks', product.centralTransportLinks);
  set('transportationPrice', product.transportationPrice);
  set('vatYN', product.vatYN);
  set('vatPercent', product.vatPercent);
  set('totalBuyingPrice', product.totalBuyingPrice);
  set('cancellation', product.cancellation);
  set('pic', product.pic);
  set('b2bPriceInstant', product.b2bPriceInstant);
  set('b2bPriceOnRequest', product.b2bPriceOnRequest);
  set('b2cPriceInstant', product.b2cPriceInstant);
  set('b2cPriceOnRequest', product.b2cPriceOnRequest);
  set('extraHrB2BInstant', product.extraHrB2BInstant);
  set('extraHrB2BRequest', product.extraHrB2BRequest);
  set('extraHrB2CInstant', product.extraHrB2CInstant);
  set('extraHrB2CRequest', product.extraHrB2CRequest);
  set('tourValidityGeneral', product.tourValidityGeneral);
  set('tourValiditySpecific', product.tourValiditySpecific);
  set('cancelInstant', product.cancelInstant);
  set('cutoffInstant', product.cutoffInstant);
  set('cancelOnRequest', product.cancelOnRequest);
  set('cutoffOnRequest', product.cutoffOnRequest);
  set('notesGeneral', product.notesGeneral);
  set('otaMasterSheet', product.otaMasterSheet);
  set('otaTravmonde', product.otaTravmonde);
  set('otaBookableTours', product.otaBookableTours);
  set('otaViator', product.otaViator);
  set('otaGyg', product.otaGyg);
  set('otaHotelbeds', product.otaHotelbeds);
  set('otaProjectExpedition', product.otaProjectExpedition);
  set('otaAirbnb', product.otaAirbnb);
  set('otaBokun', product.otaBokun);
  set('otaTrekksoft', product.otaTrekksoft);
  set('otaTuiMusement', product.otaTuiMusement);
  set('otaKlook', product.otaKlook);
  set('otaToristy', product.otaToristy);
  set('otaTourHQ', product.otaTourHQ);
  set('qualityRemarks', product.qualityRemarks);
  set('readyForUpload', product.readyForUpload);
  set('uploadedPic', product.uploadedPic);
  set('dateOfDispatch', product.dateOfDispatch);
  set('dateUploaded', product.dateUploaded);
  set('productLink', product.productLink);
  return row;
}
```

- [ ] **Step 4: Confirm dev server still loads products**

Visit http://localhost:3000/products — table loads with no errors. (The default `colMap = FIELD_TO_COL` means behaviour is identical when no overrides exist.)

- [ ] **Step 5: Commit**

```bash
git add lib/utils.ts
git commit -m "refactor: rowToProduct/productToRow accept optional colMap, default to FIELD_TO_COL"
```

---

## Task 4: Create `app/api/column-mapping/route.ts`

**Files:**
- Create: `app/api/column-mapping/route.ts`

- [ ] **Step 1: Create the route file**

```ts
// app/api/column-mapping/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import {
  getEffectiveColumnMap,
  saveColumnMappingOverrides,
  clearColumnMappingOverrides,
  colIndexToLetter,
} from '@/lib/column-mapping';
import { COLUMN_MAP, COLUMN_HEADERS, FIELD_LABELS, FIELD_TO_COL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(session.user.email))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const effectiveMap = await getEffectiveColumnMap(); // field → colIndex

    // Build response array sorted by default column order (A first)
    const entries = Object.entries(FIELD_TO_COL)
      .sort(([, a], [, b]) => a - b)
      .map(([field, defaultColIndex]) => {
        const colIndex = effectiveMap[field] ?? defaultColIndex;
        return {
          field,
          fieldLabel: FIELD_LABELS[field as keyof typeof FIELD_LABELS] ?? field,
          colIndex,
          colLetter: colIndexToLetter(colIndex),
          defaultColLetter: colIndexToLetter(defaultColIndex),
          sheetHeader: COLUMN_HEADERS[defaultColIndex] ?? '',
          isOverridden: colIndex !== defaultColIndex,
        };
      });

    return NextResponse.json(entries);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(session.user.email))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json() as { overrides: Record<string, number> };
    if (!body?.overrides || typeof body.overrides !== 'object') {
      return NextResponse.json({ error: 'Invalid body: expected { overrides: {...} }' }, { status: 400 });
    }

    const validFields = new Set(Object.keys(FIELD_TO_COL));
    const seenIndices = new Map<number, string>();
    const errors: string[] = [];

    for (const [field, idx] of Object.entries(body.overrides)) {
      if (!validFields.has(field)) {
        errors.push(`Unknown field: ${field}`);
        continue;
      }
      if (typeof idx !== 'number' || !Number.isInteger(idx) || idx < 0 || idx > 69) {
        errors.push(`Field "${field}": colIndex must be an integer 0–69, got ${idx}`);
        continue;
      }
      if (seenIndices.has(idx)) {
        errors.push(`Duplicate column index ${idx} used by both "${seenIndices.get(idx)}" and "${field}"`);
      } else {
        seenIndices.set(idx, field);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
    }

    await saveColumnMappingOverrides(body.overrides);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(session.user.email))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await clearColumnMappingOverrides();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Test GET as an admin**

Visit http://localhost:3000/api/column-mapping in the browser (while signed in as an admin).

Expected: JSON array of 70 objects, each with `field`, `fieldLabel`, `colIndex`, `colLetter`, `sheetHeader`, `isOverridden: false`.

- [ ] **Step 3: Commit**

```bash
git add app/api/column-mapping/route.ts
git commit -m "feat: add /api/column-mapping GET/PUT/DELETE endpoints"
```

---

## Task 5: Create `lib/hooks/use-column-mapping.ts`

**Files:**
- Create: `lib/hooks/use-column-mapping.ts`

- [ ] **Step 1: Create the hook**

```ts
// lib/hooks/use-column-mapping.ts
import useSWR from 'swr';

export type ColumnMappingEntry = {
  field: string;
  fieldLabel: string;
  colIndex: number;
  colLetter: string;
  defaultColLetter: string;
  sheetHeader: string;
  isOverridden: boolean;
};

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(r.statusText);
    return r.json() as Promise<ColumnMappingEntry[]>;
  });

export interface UseColumnMappingResult {
  entries: ColumnMappingEntry[];
  isLoading: boolean;
  isError: boolean;
  mutate: () => void;
}

export function useColumnMapping(): UseColumnMappingResult {
  const { data, isLoading, error, mutate } = useSWR<ColumnMappingEntry[]>(
    '/api/column-mapping',
    fetcher,
    { dedupingInterval: 30_000 },
  );

  return {
    entries: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hooks/use-column-mapping.ts
git commit -m "feat: add useColumnMapping SWR hook"
```

---

## Task 6: Create `components/settings/column-mapping-settings.tsx`

**Files:**
- Create: `components/settings/column-mapping-settings.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/settings/column-mapping-settings.tsx
'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useColumnMapping, type ColumnMappingEntry } from '@/lib/hooks/use-column-mapping';
import { colLetterToIndex } from '@/lib/column-mapping';
import { toast } from 'sonner';

type DraftMap = Record<string, string>; // field → letter currently in input

function validateDraft(
  entries: ColumnMappingEntry[],
  draft: DraftMap,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const indexToFields: Record<number, string[]> = {};

  for (const entry of entries) {
    const letter = (draft[entry.field] ?? entry.colLetter).toUpperCase();
    if (!/^[A-Z]{1,2}$/.test(letter)) {
      errors[entry.field] = 'Must be A–BR';
      continue;
    }
    let idx: number;
    try {
      idx = colLetterToIndex(letter);
    } catch {
      errors[entry.field] = 'Invalid letter';
      continue;
    }
    if (idx < 0 || idx > 69) {
      errors[entry.field] = 'Must be A–BR';
      continue;
    }
    if (!indexToFields[idx]) indexToFields[idx] = [];
    indexToFields[idx].push(entry.field);
  }

  for (const fields of Object.values(indexToFields)) {
    if (fields.length > 1) {
      for (const f of fields) {
        errors[f] = `Duplicate with: ${fields.filter((x) => x !== f).join(', ')}`;
      }
    }
  }

  return errors;
}

export function ColumnMappingSettings() {
  const { entries, isLoading, isError, mutate } = useColumnMapping();
  const [draft, setDraft] = useState<DraftMap | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = draft !== null;
  const hasOverrides = entries.some((e) => e.isOverridden);

  function handleLetterChange(field: string, value: string) {
    setDraft((prev) => ({ ...(prev ?? {}), [field]: value.toUpperCase() }));
  }

  // Resets this field's draft to the hardcoded default letter (not just the stored override).
  function resetField(field: string, hardcodedDefaultLetter: string) {
    setDraft((prev) => ({ ...(prev ?? {}), [field]: hardcodedDefaultLetter }));
  }

  function discard() {
    setDraft(null);
    setErrors({});
  }

  async function save() {
    if (!draft) return;
    const newErrors = validateDraft(entries, draft);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSaving(true);
    try {
      // Build full field→index map using draft overrides where present
      const fullMap: Record<string, number> = {};
      for (const entry of entries) {
        const letter = (draft[entry.field] ?? entry.colLetter).toUpperCase();
        fullMap[entry.field] = colLetterToIndex(letter);
      }

      const res = await fetch('/api/column-mapping', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides: fullMap }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Save failed');
      }
      await mutate();
      setDraft(null);
      setErrors({});
      toast.success('Column mapping saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save column mapping');
    } finally {
      setIsSaving(false);
    }
  }

  async function resetAll() {
    setIsSaving(true);
    try {
      const res = await fetch('/api/column-mapping', { method: 'DELETE' });
      if (!res.ok) throw new Error('Reset failed');
      await mutate();
      setDraft(null);
      setErrors({});
      toast.success('Reset to defaults');
    } catch {
      toast.error('Failed to reset');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-[hsl(var(--text-secondary))]">Loading…</p>;
  }

  if (isError) {
    return <p className="text-sm text-red-500">Failed to load column mapping. Please refresh.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {isDirty && (
          <>
            <Button size="sm" onClick={save} disabled={isSaving}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={discard} disabled={isSaving}>
              Discard
            </Button>
          </>
        )}
        {!isDirty && hasOverrides && (
          <Button
            size="sm"
            variant="outline"
            onClick={resetAll}
            disabled={isSaving}
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset all to defaults
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[hsl(var(--border))] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
              <th className="px-3 py-2 text-left font-medium text-[hsl(var(--text-secondary))]">App Field</th>
              <th className="px-3 py-2 text-left font-medium text-[hsl(var(--text-secondary))] w-24">Column</th>
              <th className="px-3 py-2 text-left font-medium text-[hsl(var(--text-secondary))]">Sheet Header</th>
              <th className="px-3 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => {
              const currentLetter = draft?.[entry.field] ?? entry.colLetter;
              const error = errors[entry.field];
              // isModified: true if current effective letter differs from the hardcoded default
              const isModified = currentLetter !== entry.defaultColLetter;

              return (
                <tr
                  key={entry.field}
                  className={
                    i % 2 === 0
                      ? 'bg-[hsl(var(--background))]'
                      : 'bg-[hsl(var(--surface))]'
                  }
                >
                  {/* App field label */}
                  <td className="px-3 py-1.5">
                    <span className="font-medium">{entry.fieldLabel}</span>
                    {isModified && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                        modified
                      </span>
                    )}
                  </td>

                  {/* Column letter input */}
                  <td className="px-3 py-1.5">
                    <div className="flex flex-col gap-0.5">
                      <Input
                        value={currentLetter}
                        onChange={(e) => handleLetterChange(entry.field, e.target.value)}
                        className={`h-7 w-16 text-center font-mono text-sm uppercase ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        maxLength={2}
                        aria-label={`Column letter for ${entry.fieldLabel}`}
                      />
                      {error && (
                        <span className="text-xs text-red-500">{error}</span>
                      )}
                    </div>
                  </td>

                  {/* Sheet header name */}
                  <td className="px-3 py-1.5 text-[hsl(var(--text-secondary))]">
                    {entry.sheetHeader}
                  </td>

                  {/* Per-row reset icon */}
                  <td className="px-3 py-1.5">
                    {isModified && (
                      <button
                        onClick={() => resetField(entry.field, entry.defaultColLetter)}
                        title="Reset to default"
                        className="text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/settings/column-mapping-settings.tsx lib/hooks/use-column-mapping.ts
git commit -m "feat: add ColumnMappingSettings UI component"
```

---

## Task 7: Add Column Mapping tab to Settings page

**Files:**
- Modify: `app/(app)/settings/page.tsx`

- [ ] **Step 1: Add import and new tab**

In `app/(app)/settings/page.tsx`:

Add import at the top (alongside other settings imports):
```ts
import { ColumnMappingSettings } from '@/components/settings/column-mapping-settings';
```

In the `TabsList`, add after the `column-groups` trigger:
```tsx
{showAccessTab && <TabsTrigger value="column-mapping">Column Mapping</TabsTrigger>}
```

After the `column-groups` `TabsContent`, add:
```tsx
{showAccessTab && (
  <TabsContent value="column-mapping" className="mt-4">
    <ColumnMappingSettings />
  </TabsContent>
)}
```

- [ ] **Step 2: Verify the tab appears**

Sign in as an admin and navigate to http://localhost:3000/settings. Confirm:
- "Column Mapping" tab is visible next to Column Groups.
- Clicking it shows a table of 70 rows with field labels, column letters (A–BR), and sheet headers.
- `isOverridden` is false for all rows (no overrides saved yet).

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/settings/page.tsx
git commit -m "feat: add Column Mapping tab to Settings page"
```

---

## Task 8: Update `app/api/products/route.ts` — use dynamic colMap

**Files:**
- Modify: `app/api/products/route.ts`

- [ ] **Step 1: Replace file contents**

```ts
// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchAllRows, fetchColumnHyperlinks, fetchColumnRichTextLinks, appendRow, updateCellHyperlink } from '@/lib/sheets';
import { rowToProduct, productToRow, parseLinkField } from '@/lib/utils';
import { getEffectiveColumnMap } from '@/lib/column-mapping';
import type { TourProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [colMap, rows] = await Promise.all([
      getEffectiveColumnMap(),
      fetchAllRows(),
    ]);

    const linkColIndex = colMap['link'];
    const imageLinksColIndex = colMap['imageLinks'];

    const [linkHyperlinks, imageLinksRichText] = await Promise.all([
      fetchColumnHyperlinks(linkColIndex),
      fetchColumnRichTextLinks(imageLinksColIndex),
    ]);

    const products: TourProduct[] = rows
      .slice(1)
      .map((row, i) => {
        const rowIndex = i + 2;
        return rowToProduct(
          row,
          rowIndex,
          linkHyperlinks.get(rowIndex),
          imageLinksRichText.get(rowIndex),
          colMap,
        );
      });

    return NextResponse.json(products);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const [colMap, body] = await Promise.all([
      getEffectiveColumnMap(),
      req.json() as Promise<Omit<TourProduct, 'rowIndex'>>,
    ]);

    const rowValues = productToRow(body, colMap);
    const newRowIndex = await appendRow(rowValues);

    if (body.link) {
      const { text, url } = parseLinkField(body.link);
      if (url) {
        await updateCellHyperlink(newRowIndex, colMap['link'], text, url);
      }
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify products still load**

Visit http://localhost:3000/products. Table should load with the same data as before.

- [ ] **Step 3: Commit**

```bash
git add app/api/products/route.ts
git commit -m "feat: products GET/POST use dynamic column mapping"
```

---

## Task 9: Update `app/api/products/[rowIndex]/route.ts` and `bulk/route.ts`

**Files:**
- Modify: `app/api/products/[rowIndex]/route.ts`
- Modify: `app/api/products/bulk/route.ts`

- [ ] **Step 1: Replace `[rowIndex]/route.ts`**

```ts
// app/api/products/[rowIndex]/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { updateRow, updateCell, updateCellHyperlink, deleteRow, findRowByProductName, fetchRow } from '@/lib/sheets';
import { productToRow, parseLinkField } from '@/lib/utils';
import { getEffectiveColumnMap } from '@/lib/column-mapping';
import type { TourProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Params = { params: { rowIndex: string } };

export async function PUT(req: NextRequest, { params }: Params) {
  const rowIndex = parseInt(params.rowIndex, 10);
  if (isNaN(rowIndex) || rowIndex < 2) {
    return NextResponse.json({ error: 'Invalid rowIndex' }, { status: 400 });
  }
  try {
    const [colMap, body] = await Promise.all([
      getEffectiveColumnMap(),
      req.json() as Promise<Omit<TourProduct, 'rowIndex'>>,
    ]);

    const linkTitle = parseLinkField(body.link ?? '').text;
    let targetRowIndex = rowIndex;
    if (linkTitle) {
      const foundRow = await findRowByProductName(linkTitle);
      if (foundRow === null) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      targetRowIndex = foundRow;
    }

    const currentRow = await fetchRow(targetRowIndex);
    while (currentRow.length < 70) currentRow.push('');

    const submittedRow = productToRow(body, colMap);
    const mergedRow = currentRow.map((currentVal, i) => {
      const submitted = submittedRow[i] ?? '';
      return submitted !== '' ? submitted : currentVal;
    });

    await updateRow(targetRowIndex, mergedRow);

    const { text: linkText, url: linkUrl } = parseLinkField(body.link ?? '');
    if (linkUrl || linkText) {
      await updateCellHyperlink(targetRowIndex, colMap['link'], linkText, linkUrl);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const rowIndex = parseInt(params.rowIndex, 10);
  if (isNaN(rowIndex) || rowIndex < 2) {
    return NextResponse.json({ error: 'Invalid rowIndex' }, { status: 400 });
  }
  try {
    const [colMap, body] = await Promise.all([
      getEffectiveColumnMap(),
      req.json() as Promise<{ field: string; value: string; expectedLinkTitle?: string }>,
    ]);

    const colIndex = colMap[body.field];
    if (colIndex === undefined) {
      return NextResponse.json({ error: `Unknown field: ${body.field}` }, { status: 400 });
    }

    let targetRowIndex = rowIndex;
    if (body.field !== 'link' && body.expectedLinkTitle) {
      const foundRow = await findRowByProductName(body.expectedLinkTitle);
      if (foundRow === null) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      targetRowIndex = foundRow;
    }

    if (body.field === 'link') {
      const { text, url } = parseLinkField(body.value ?? '');
      await updateCellHyperlink(targetRowIndex, colIndex, text, url);
    } else {
      await updateCell(targetRowIndex, colIndex, body.value);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const rowIndex = parseInt(params.rowIndex, 10);
  if (isNaN(rowIndex) || rowIndex < 2) {
    return NextResponse.json({ error: 'Invalid rowIndex' }, { status: 400 });
  }
  try {
    await deleteRow(rowIndex);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Replace `bulk/route.ts`**

```ts
// app/api/products/bulk/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { batchUpdateRows, deleteRow, fetchAllRows } from '@/lib/sheets';
import { getEffectiveColumnMap } from '@/lib/column-mapping';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
  try {
    const [colMap, body] = await Promise.all([
      getEffectiveColumnMap(),
      req.json() as Promise<{ rowIndexes: number[]; field: string; value: string }>,
    ]);

    const { rowIndexes, field, value } = body;

    if (!Array.isArray(rowIndexes) || rowIndexes.length === 0) {
      return NextResponse.json({ error: 'rowIndexes must be a non-empty array' }, { status: 400 });
    }
    if (!field || typeof value !== 'string') {
      return NextResponse.json({ error: 'field and value are required' }, { status: 400 });
    }

    const colIndex = colMap[field];
    if (colIndex === undefined) {
      return NextResponse.json({ error: `Unknown field: ${field}` }, { status: 400 });
    }

    if (rowIndexes.some((r) => r < 2)) {
      return NextResponse.json({ error: 'All rowIndexes must be >= 2' }, { status: 400 });
    }

    const allRows = await fetchAllRows();

    const updates = rowIndexes.map((rowIndex) => {
      const currentRow = [...(allRows[rowIndex - 1] ?? [])];
      while (currentRow.length < 70) currentRow.push('');
      currentRow[colIndex] = value;
      return { rowIndex, values: currentRow };
    });

    await batchUpdateRows(updates);

    return NextResponse.json({ ok: true, updated: rowIndexes.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json() as { rowIndexes: number[] };

    if (!Array.isArray(body.rowIndexes) || body.rowIndexes.length === 0) {
      return NextResponse.json({ error: 'rowIndexes must be a non-empty array' }, { status: 400 });
    }

    const sorted = [...body.rowIndexes].sort((a, b) => b - a);
    for (const rowIndex of sorted) {
      await deleteRow(rowIndex);
    }

    return NextResponse.json({ ok: true, deleted: sorted.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify editing a product still works**

In the products table, open a product, change a field, and save. Confirm the save succeeds and the updated value shows on reload.

- [ ] **Step 4: Commit**

```bash
git add "app/api/products/[rowIndex]/route.ts" app/api/products/bulk/route.ts
git commit -m "feat: product write routes use dynamic column mapping"
```

---

## Task 10: End-to-end verification

- [ ] **Step 1: Test the full mapping edit flow**

1. Go to http://localhost:3000/settings → **Column Mapping** tab.
2. Confirm 70 rows load, all showing default letters (A–BR), no "modified" badges.
3. Change a field's letter to an invalid value (e.g. "ZZ") — confirm inline error appears.
4. Change it back. Confirm error clears.
5. Change `country` from `A` to the letter for column B (`B`) and `city` from `B` to `A`.
6. Click **Save** — should fail validation: both fields would have each other's letter assigned simultaneously — wait, this is actually a valid swap. Two separate rows, each assigned a unique letter, so this should pass. Confirm save succeeds and "modified" badges appear on `country` and `city`.
7. Reload the page — confirm the modified letters persist.
8. Verify the products table still loads (the app now reads country from col B and city from col A — the data will appear swapped in the UI, confirming the mapping is live).
9. Click **Reset all to defaults** → confirm the badges clear and letters return to A/B respectively.

- [ ] **Step 2: Test duplicate detection**

Assign two different fields the same letter (e.g. set both `country` and `city` to `A`). Click Save — confirm errors appear on both rows saying "Duplicate with: ..."

- [ ] **Step 3: Commit (if any final fixes were made)**

```bash
git add -p
git commit -m "fix: <describe any issues found>"
```
