# Written Products Column Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Written Products" sub-tab inside the existing "Column Mapping" settings tab so admins can remap written product fields to different spreadsheet columns, mirroring the existing tour-products column mapping feature.

**Architecture:** New `lib/written-column-mapping.ts` + `/api/written-column-mapping` route + SWR hook + settings component mirror the existing tour-product pattern exactly. `lib/written-products-utils.ts` gains a `colMap` parameter; API routes fetch the effective map and pass it through. The Column Mapping settings tab grows internal "Products" / "Written Products" sub-tabs using shadcn Tabs.

**Tech Stack:** Next.js 15 App Router, MongoDB (new `writtencolumnmapping` collection), SWR, shadcn/ui Tabs, Google Sheets API (via existing wrappers)

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `lib/written-column-mapping.ts` | Defaults, effective map, save/clear overrides |
| Create | `app/api/written-column-mapping/route.ts` | GET / PUT / DELETE admin API |
| Create | `lib/hooks/use-written-column-mapping.ts` | SWR client hook |
| Create | `components/settings/written-column-mapping-settings.tsx` | Settings UI for written products |
| Modify | `lib/written-products-utils.ts` | Accept `colMap` param in both functions |
| Modify | `lib/written-products-sheets.ts` | Dynamic range in `updateWrittenProductRow` |
| Modify | `app/api/written-products/route.ts` | Fetch effective map, pass to utils |
| Modify | `app/api/written-products/[rowIndex]/route.ts` | Fetch effective map, pass to utils |
| Modify | `components/settings/column-mapping-settings.tsx` | Add internal sub-tabs |

---

## Task 1: Create `lib/written-column-mapping.ts`

**Files:**
- Create: `lib/written-column-mapping.ts`

- [ ] **Step 1: Create the file**

```typescript
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
```

- [ ] **Step 2: Verify lint passes**

```bash
npm run lint -- --max-warnings 0 lib/written-column-mapping.ts
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/written-column-mapping.ts
git commit -m "feat: add written-column-mapping lib (defaults, effective map, save/clear)"
```

---

## Task 2: Create `app/api/written-column-mapping/route.ts`

**Files:**
- Create: `app/api/written-column-mapping/route.ts`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p app/api/written-column-mapping
```

- [ ] **Step 2: Write the route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import {
  getEffectiveWrittenColumnMap,
  saveWrittenColumnMappingOverrides,
  clearWrittenColumnMappingOverrides,
  colIndexToLetter,
  WRITTEN_FIELD_TO_COL,
  WRITTEN_FIELD_LABELS,
} from '@/lib/written-column-mapping';

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

    const effectiveMap = await getEffectiveWrittenColumnMap();

    const entries = Object.entries(WRITTEN_FIELD_TO_COL)
      .sort(([, a], [, b]) => a - b)
      .map(([field, defaultColIndex]) => {
        const colIndex = effectiveMap[field] ?? defaultColIndex;
        return {
          field,
          fieldLabel: WRITTEN_FIELD_LABELS[field] ?? field,
          colIndex,
          colLetter: colIndexToLetter(colIndex),
          defaultColLetter: colIndexToLetter(defaultColIndex),
          sheetHeader: WRITTEN_FIELD_LABELS[field] ?? field,
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

    const validFields = new Set(Object.keys(WRITTEN_FIELD_TO_COL));
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

    await saveWrittenColumnMappingOverrides(body.overrides);
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

    await clearWrittenColumnMappingOverrides();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify lint passes**

```bash
npm run lint -- --max-warnings 0 app/api/written-column-mapping/route.ts
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/written-column-mapping/route.ts
git commit -m "feat: add /api/written-column-mapping GET/PUT/DELETE route"
```

---

## Task 3: Create `lib/hooks/use-written-column-mapping.ts`

**Files:**
- Create: `lib/hooks/use-written-column-mapping.ts`

- [ ] **Step 1: Create the file**

```typescript
import useSWR from 'swr';
import type { ColumnMappingEntry } from './use-column-mapping';

export type { ColumnMappingEntry };

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(r.statusText);
    return r.json() as Promise<ColumnMappingEntry[]>;
  });

export interface UseWrittenColumnMappingResult {
  entries: ColumnMappingEntry[];
  isLoading: boolean;
  isError: boolean;
  mutate: () => void;
}

export function useWrittenColumnMapping(): UseWrittenColumnMappingResult {
  const { data, isLoading, error, mutate } = useSWR<ColumnMappingEntry[]>(
    '/api/written-column-mapping',
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

- [ ] **Step 2: Verify lint passes**

```bash
npm run lint -- --max-warnings 0 lib/hooks/use-written-column-mapping.ts
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/use-written-column-mapping.ts
git commit -m "feat: add useWrittenColumnMapping SWR hook"
```

---

## Task 4: Update `lib/written-products-utils.ts`

Make both functions accept an explicit `colMap` parameter instead of hardcoded indices. The callers (API routes) will always pass the effective map fetched from MongoDB.

**Files:**
- Modify: `lib/written-products-utils.ts`

- [ ] **Step 1: Replace the file contents**

The `rowToWrittenProduct` signature changes: `textLinkUrl` becomes explicit (not optional) and `colMap` is added as a required 4th param. `writtenProductToRow` gains `colMap` as a required 2nd param and now writes values at the correct column positions rather than assuming sequential positions.

```typescript
// lib/written-products-utils.ts
import type { WrittenProduct } from '@/lib/types';
import { parseLinkField } from '@/lib/utils';

function parseBoolean(v: string | undefined): boolean {
  return v?.toUpperCase() === 'TRUE';
}

export function rowToWrittenProduct(
  row: string[],
  rowIndex: number,
  textLinkUrl: string | undefined,
  colMap: Record<string, number>,
): WrittenProduct {
  const textLinkRaw = row[colMap.textLink] ?? '';
  const textLink = textLinkUrl ? `${textLinkRaw}||${textLinkUrl}` : textLinkRaw;
  return {
    rowIndex,
    country: row[colMap.country] ?? '',
    cityDestination: row[colMap.cityDestination] ?? '',
    state: row[colMap.state] ?? '',
    tourType: row[colMap.tourType] ?? '',
    textLink,
    ccOk: parseBoolean(row[colMap.ccOk]),
    isOk: parseBoolean(row[colMap.isOk]),
    rrOk: parseBoolean(row[colMap.rrOk]),
    ssOk: parseBoolean(row[colMap.ssOk]),
    contentExist: parseBoolean(row[colMap.contentExist]),
    b2b: parseBoolean(row[colMap.b2b]),
    b2c: parseBoolean(row[colMap.b2c]),
    ssNotes: parseBoolean(row[colMap.ssNotes]),
  };
}

export function writtenProductToRow(
  product: Omit<WrittenProduct, 'rowIndex'>,
  colMap: Record<string, number>,
): string[] {
  const { text, url } = parseLinkField(product.textLink || '');
  const textLinkDisplayText = text || url || product.textLink;

  const maxIdx = Math.max(...Object.values(colMap));
  const row: string[] = new Array(maxIdx + 1).fill('');

  row[colMap.country] = product.country;
  row[colMap.cityDestination] = product.cityDestination;
  row[colMap.state] = product.state;
  row[colMap.tourType] = product.tourType;
  row[colMap.textLink] = textLinkDisplayText;
  row[colMap.ccOk] = product.ccOk ? 'TRUE' : 'FALSE';
  row[colMap.isOk] = product.isOk ? 'TRUE' : 'FALSE';
  row[colMap.rrOk] = product.rrOk ? 'TRUE' : 'FALSE';
  row[colMap.ssOk] = product.ssOk ? 'TRUE' : 'FALSE';
  row[colMap.contentExist] = product.contentExist ? 'TRUE' : 'FALSE';
  row[colMap.b2b] = product.b2b ? 'TRUE' : 'FALSE';
  row[colMap.b2c] = product.b2c ? 'TRUE' : 'FALSE';
  row[colMap.ssNotes] = product.ssNotes ? 'TRUE' : 'FALSE';

  return row;
}
```

- [ ] **Step 2: Verify lint passes**

```bash
npm run lint -- --max-warnings 0 lib/written-products-utils.ts
```

Expected: no errors (TypeScript will catch any callers that haven't been updated yet — fix those in the next tasks).

- [ ] **Step 3: Commit**

```bash
git add lib/written-products-utils.ts
git commit -m "refactor: accept colMap param in rowToWrittenProduct and writtenProductToRow"
```

---

## Task 5: Update `lib/written-products-sheets.ts`

Make `updateWrittenProductRow` use a dynamic end column derived from the values array length so remapped fields beyond column M are written correctly.

**Files:**
- Modify: `lib/written-products-sheets.ts`

- [ ] **Step 1: Add the colIndexToLetter import and update `updateWrittenProductRow`**

At the top of the file, add the import (after the existing `import 'server-only'` line):

```typescript
import { colIndexToLetter } from '@/lib/column-utils';
```

Replace the `updateWrittenProductRow` function body:

```typescript
export async function updateWrittenProductRow(
  accessToken: string,
  rowIndex: number,
  values: string[],
): Promise<void> {
  const sheets = getUserSheetsClient(accessToken);
  const endCol = colIndexToLetter(values.length - 1);
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `'${SHEET_NAME}'!A${rowIndex}:${endCol}${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  });
}
```

- [ ] **Step 2: Verify lint passes**

```bash
npm run lint -- --max-warnings 0 lib/written-products-sheets.ts
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/written-products-sheets.ts
git commit -m "fix: use dynamic end column in updateWrittenProductRow"
```

---

## Task 6: Update `app/api/written-products/route.ts`

Fetch the effective written column map and pass it to both `rowToWrittenProduct` and `writtenProductToRow`.

**Files:**
- Modify: `app/api/written-products/route.ts`

- [ ] **Step 1: Add the import**

Add to the existing imports at the top of the file:

```typescript
import { getEffectiveWrittenColumnMap } from '@/lib/written-column-mapping';
```

- [ ] **Step 2: Update the GET handler**

Replace the GET handler body:

```typescript
export async function GET() {
  try {
    const cached = getCachedWrittenProducts();
    if (cached) return NextResponse.json(cached);

    const [accessToken, colMap] = await Promise.all([
      requireGoogleAccessToken(),
      getEffectiveWrittenColumnMap(),
    ]);
    const [rows, textLinkUrls] = await Promise.all([
      fetchAllWrittenProductRows(accessToken),
      fetchTextLinkHyperlinks(accessToken),
    ]);
    const products: WrittenProduct[] = rows
      .slice(1)
      .map((row, i) => rowToWrittenProduct(row, i + 2, textLinkUrls.get(i + 2), colMap));
    setCachedWrittenProducts(products);
    return NextResponse.json(products);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err instanceof GoogleAccessTokenError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 3: Update the POST handler**

Replace the POST handler body:

```typescript
export async function POST(req: NextRequest) {
  try {
    const [accessToken, colMap] = await Promise.all([
      requireGoogleAccessToken(),
      getEffectiveWrittenColumnMap(),
    ]);
    const body = (await req.json()) as Omit<WrittenProduct, 'rowIndex'>;
    const values = writtenProductToRow(body, colMap);
    const newRowIndex = await appendWrittenProductRow(accessToken, values);
    const { text, url } = parseLinkField(body.textLink || '');
    if (url) {
      await updateTextLinkHyperlink(accessToken, newRowIndex, text || url, url);
    }
    invalidateWrittenProductsCache();
    return NextResponse.json({ ...body, rowIndex: newRowIndex }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err instanceof GoogleAccessTokenError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 4: Verify lint passes**

```bash
npm run lint -- --max-warnings 0 app/api/written-products/route.ts
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/written-products/route.ts
git commit -m "feat: pass effective written column map to GET/POST written-products handlers"
```

---

## Task 7: Update `app/api/written-products/[rowIndex]/route.ts`

Fetch the effective written column map in the GET and PUT handlers. DELETE does not convert rows so needs no change.

**Files:**
- Modify: `app/api/written-products/[rowIndex]/route.ts`

- [ ] **Step 1: Add the import**

Add to the existing imports at the top of the file:

```typescript
import { getEffectiveWrittenColumnMap } from '@/lib/written-column-mapping';
```

- [ ] **Step 2: Update the GET handler**

Replace the GET handler body:

```typescript
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { rowIndex: rowIndexStr } = await params;
    const rowIndex = parseRowIndex(rowIndexStr);
    if (rowIndex === null) return NextResponse.json({ error: 'Invalid row index' }, { status: 400 });

    const [accessToken, colMap] = await Promise.all([
      requireGoogleAccessToken(),
      getEffectiveWrittenColumnMap(),
    ]);
    const rows = await fetchAllWrittenProductRows(accessToken);
    const row = rows[rowIndex - 1];
    if (!row) return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    return NextResponse.json(rowToWrittenProduct(row, rowIndex, undefined, colMap));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err instanceof GoogleAccessTokenError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 3: Update the PUT handler**

Replace the PUT handler body:

```typescript
export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { rowIndex: rowIndexStr } = await params;
    const rowIndex = parseRowIndex(rowIndexStr);
    if (rowIndex === null) return NextResponse.json({ error: 'Invalid row index' }, { status: 400 });

    const [accessToken, colMap] = await Promise.all([
      requireGoogleAccessToken(),
      getEffectiveWrittenColumnMap(),
    ]);
    const body = (await req.json()) as Omit<WrittenProduct, 'rowIndex'>;
    const values = writtenProductToRow(body, colMap);
    const { text, url } = parseLinkField(body.textLink || '');
    await updateWrittenProductRow(accessToken, rowIndex, values);
    if (url) {
      await updateTextLinkHyperlink(accessToken, rowIndex, text || url, url);
    }
    invalidateWrittenProductsCache();
    return NextResponse.json({ ...body, rowIndex });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err instanceof GoogleAccessTokenError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 4: Verify lint passes**

```bash
npm run lint -- --max-warnings 0 "app/api/written-products/[rowIndex]/route.ts"
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "app/api/written-products/[rowIndex]/route.ts"
git commit -m "feat: pass effective written column map to GET/PUT written-products/[rowIndex] handlers"
```

---

## Task 8: Create `components/settings/written-column-mapping-settings.tsx`

A near-exact copy of `column-mapping-settings.tsx` that fetches from `/api/written-column-mapping` via `useWrittenColumnMapping`.

**Files:**
- Create: `components/settings/written-column-mapping-settings.tsx`

- [ ] **Step 1: Create the file**

```typescript
// components/settings/written-column-mapping-settings.tsx
'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWrittenColumnMapping, type ColumnMappingEntry } from '@/lib/hooks/use-written-column-mapping';
import { colLetterToIndex } from '@/lib/column-utils';
import { toast } from 'sonner';

type DraftMap = Record<string, string>;

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

export function WrittenColumnMappingSettings() {
  const { entries, isLoading, isError, mutate } = useWrittenColumnMapping();
  const [draft, setDraft] = useState<DraftMap | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = draft !== null;
  const hasOverrides = entries.some((e) => e.isOverridden);

  function handleLetterChange(field: string, value: string) {
    setDraft((prev) => ({ ...(prev ?? {}), [field]: value.toUpperCase() }));
  }

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
      const fullMap: Record<string, number> = {};
      for (const entry of entries) {
        const letter = (draft[entry.field] ?? entry.colLetter).toUpperCase();
        fullMap[entry.field] = colLetterToIndex(letter);
      }

      const res = await fetch('/api/written-column-mapping', {
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
      toast.success('Written column mapping saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save written column mapping');
    } finally {
      setIsSaving(false);
    }
  }

  async function resetAll() {
    setIsSaving(true);
    try {
      const res = await fetch('/api/written-column-mapping', { method: 'DELETE' });
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
    return <p className="text-sm text-red-500">Failed to load written column mapping. Please refresh.</p>;
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
                  <td className="px-3 py-1.5">
                    <span className="font-medium">{entry.fieldLabel}</span>
                    {isModified && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                        modified
                      </span>
                    )}
                  </td>

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

                  <td className="px-3 py-1.5 text-[hsl(var(--text-secondary))]">
                    {entry.sheetHeader}
                  </td>

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

- [ ] **Step 2: Verify lint passes**

```bash
npm run lint -- --max-warnings 0 components/settings/written-column-mapping-settings.tsx
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/settings/written-column-mapping-settings.tsx
git commit -m "feat: add WrittenColumnMappingSettings component"
```

---

## Task 9: Update `components/settings/column-mapping-settings.tsx` to add sub-tabs

Wrap the existing `ColumnMappingSettings` content in a "Products" sub-tab and add a "Written Products" sub-tab alongside it.

**Files:**
- Modify: `components/settings/column-mapping-settings.tsx`

- [ ] **Step 1: Replace the file contents**

```typescript
// components/settings/column-mapping-settings.tsx
'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useColumnMapping, type ColumnMappingEntry } from '@/lib/hooks/use-column-mapping';
import { colLetterToIndex } from '@/lib/column-utils';
import { toast } from 'sonner';
import { WrittenColumnMappingSettings } from './written-column-mapping-settings';

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

function ProductsColumnMapping() {
  const { entries, isLoading, isError, mutate } = useColumnMapping();
  const [draft, setDraft] = useState<DraftMap | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = draft !== null;
  const hasOverrides = entries.some((e) => e.isOverridden);

  function handleLetterChange(field: string, value: string) {
    setDraft((prev) => ({ ...(prev ?? {}), [field]: value.toUpperCase() }));
  }

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
                  <td className="px-3 py-1.5">
                    <span className="font-medium">{entry.fieldLabel}</span>
                    {isModified && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                        modified
                      </span>
                    )}
                  </td>

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

                  <td className="px-3 py-1.5 text-[hsl(var(--text-secondary))]">
                    {entry.sheetHeader}
                  </td>

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

export function ColumnMappingSettings() {
  return (
    <Tabs defaultValue="products">
      <TabsList>
        <TabsTrigger value="products">Products</TabsTrigger>
        <TabsTrigger value="written-products">Written Products</TabsTrigger>
      </TabsList>
      <TabsContent value="products" className="mt-4">
        <ProductsColumnMapping />
      </TabsContent>
      <TabsContent value="written-products" className="mt-4">
        <WrittenColumnMappingSettings />
      </TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 2: Verify lint passes**

```bash
npm run lint -- --max-warnings 0 components/settings/column-mapping-settings.tsx
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/settings/column-mapping-settings.tsx
git commit -m "feat: add Products/Written Products sub-tabs in Column Mapping settings"
```

---

## Task 10: Full lint check and manual verification

- [ ] **Step 1: Run full lint**

```bash
npm run lint
```

Expected: no errors or warnings beyond any pre-existing ones.

- [ ] **Step 2: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 3: Verify Products sub-tab (existing behavior unchanged)**

1. Navigate to Settings → Column Mapping
2. Confirm the "Products" tab is active by default
3. Confirm all 70 tour product fields appear with their current column letters
4. Edit one field's column letter → Save → confirm toast "Column mapping saved"
5. Refresh → confirm the override persists
6. Click "Reset all to defaults" → confirm toast "Reset to defaults"

- [ ] **Step 4: Verify Written Products sub-tab (new)**

1. Click the "Written Products" tab
2. Confirm all 13 written product fields appear: Country (A), City Destination (B), State (C), Tour Type (D), Text Link (E), CC OK (F), IS OK (G), RR OK (H), SS OK (I), Content Exist (J), B2B (K), B2C (L), SS Notes (M)
3. Edit one field's column letter (e.g., change Country from A to B) → Save → confirm toast "Written column mapping saved"
4. Refresh → confirm the override persists with "modified" badge
5. Click the reset icon on that row → Save → confirm it returns to A
6. Verify "Reset all to defaults" button appears when overrides exist and clears them

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: verify written products column mapping feature complete"
```

---

## Known Limitation

The `fetchTextLinkHyperlinks` and `updateTextLinkHyperlink` functions in `lib/written-products-sheets.ts` reference the textLink column by its hardcoded default (column E / index 4). If an admin remaps `textLink` to a different column, hyperlink read/write will still target column E. This edge case is out of scope for this implementation.
