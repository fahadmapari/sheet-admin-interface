# Edit History Session Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the edit history (including revert capability) in `sessionStorage` so it survives page refreshes within the same browser tab.

**Architecture:** `useEditHistory` becomes generic over a payload type `P`. Each edit record stores a serializable `revertPayload: P` alongside the runtime `revertFn`. The hook accepts a `buildRevertFn` factory; on mount it loads stored records from `sessionStorage` and calls `buildRevertFn(payload)` to reconstruct `revertFn` for each. `EditHistoryPopover` is made generic to maintain end-to-end type safety.

**Tech Stack:** React 19, TypeScript 5, `sessionStorage` (Web API, no new dependencies)

---

## File Map

| File | Action | What changes |
|---|---|---|
| `lib/hooks/use-edit-history.ts` | Modify | Add `P` generic, `storageKey`, `buildRevertFn`, sessionStorage hydration/persist |
| `components/ui/edit-history-popover.tsx` | Modify | Make props generic over `P` to keep end-to-end type safety |
| `app/(app)/products/products-client.tsx` | Modify | Define `ProductFieldPayload`, pass options to hook, update `push` call |
| `app/(app)/written-products/written-products-client.tsx` | Modify | Define `WrittenProductPayload`, pass options to hook, update `push` call |

---

## Task 1: Update `useEditHistory` hook

**Files:**
- Modify: `lib/hooks/use-edit-history.ts`

- [ ] **Step 1: Replace the file contents**

```ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { nanoid } from 'nanoid';

export type EditRecord<P = unknown> = {
  id: string;
  rowLabel: string;
  fieldLabel: string;
  oldValueDisplay: string;
  newValueDisplay: string;
  timestamp: number;
  revertPayload: P;
  revertFn: () => Promise<void>;
};

type StoredRecord<P> = Omit<EditRecord<P>, 'revertFn'>;

const MAX_HISTORY = 10;

export function useEditHistory<P>(options: {
  storageKey: string;
  buildRevertFn: (payload: P) => () => Promise<void>;
}) {
  const { storageKey } = options;
  const buildRevertFnRef = useRef(options.buildRevertFn);
  buildRevertFnRef.current = options.buildRevertFn;

  // historyRef mirrors state so push/revert can read current value synchronously
  // without causing side effects inside React state updaters.
  const historyRef = useRef<EditRecord<P>[]>([]);
  const [history, setHistoryState] = useState<EditRecord<P>[]>([]);

  const persist = useCallback(
    (records: EditRecord<P>[]) => {
      try {
        const stored: StoredRecord<P>[] = records.map(
          ({ revertFn: _fn, ...rest }) => rest,
        );
        sessionStorage.setItem(storageKey, JSON.stringify(stored));
      } catch {
        // sessionStorage unavailable (e.g. quota exceeded) — silently skip
      }
    },
    [storageKey],
  );

  // Hydrate from sessionStorage once on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const stored = JSON.parse(raw) as StoredRecord<P>[];
      if (!Array.isArray(stored)) throw new Error('invalid shape');
      const records: EditRecord<P>[] = stored.map((r) => ({
        ...r,
        revertFn: buildRevertFnRef.current(r.revertPayload),
      }));
      historyRef.current = records;
      setHistoryState(records);
    } catch {
      sessionStorage.removeItem(storageKey);
    }
  // storageKey is the only external dep; buildRevertFnRef always has the latest fn
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const push = useCallback(
    (record: Omit<EditRecord<P>, 'id' | 'timestamp' | 'revertFn'>) => {
      const entry: EditRecord<P> = {
        ...record,
        id: nanoid(),
        timestamp: Date.now(),
        revertFn: buildRevertFnRef.current(record.revertPayload),
      };
      const next = [entry, ...historyRef.current].slice(0, MAX_HISTORY);
      historyRef.current = next;
      setHistoryState(next);
      persist(next);
    },
    [persist],
  );

  // Throws if revertFn fails; caller is responsible for error handling.
  const revert = useCallback(
    async (record: EditRecord<P>) => {
      await record.revertFn();
      const next = historyRef.current.filter((r) => r.id !== record.id);
      historyRef.current = next;
      setHistoryState(next);
      persist(next);
    },
    [persist],
  );

  return { history, push, revert };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run lint`  
Expected: No errors in `lib/hooks/use-edit-history.ts`

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/use-edit-history.ts
git commit -m "feat: make useEditHistory generic with sessionStorage persistence"
```

---

## Task 2: Make `EditHistoryPopover` generic

The popover's `onRevert` callback must match the `history` element type. Without a generic, TypeScript would flag a parameter type mismatch when callers pass a typed `handleRevert`.

**Files:**
- Modify: `components/ui/edit-history-popover.tsx`

- [ ] **Step 1: Add the generic parameter to the props interface and component**

Change lines 20–35 (the interface and function signature) from:

```ts
interface EditHistoryPopoverProps {
  history: EditRecord[];
  onRevert: (record: EditRecord) => Promise<void>;
}

export function EditHistoryPopover({ history, onRevert }: EditHistoryPopoverProps) {
```

To:

```ts
interface EditHistoryPopoverProps<P = unknown> {
  history: EditRecord<P>[];
  onRevert: (record: EditRecord<P>) => Promise<void>;
}

export function EditHistoryPopover<P>({ history, onRevert }: EditHistoryPopoverProps<P>) {
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run lint`  
Expected: No errors in `components/ui/edit-history-popover.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/ui/edit-history-popover.tsx
git commit -m "feat: make EditHistoryPopover generic over payload type"
```

---

## Task 3: Update `products-client.tsx`

**Files:**
- Modify: `app/(app)/products/products-client.tsx`

- [ ] **Step 1: Add `ProductFieldPayload` type and update `useEditHistory` call**

Find this block (around line 163):

```ts
const { history, push, revert } = useEditHistory();
```

Replace it with:

```ts
type ProductFieldPayload = {
  rowIndex: number;
  field: string;
  oldValue: string;
  expectedLinkTitle: string;
};

const buildProductRevertFn = useCallback(
  (payload: ProductFieldPayload) => async () => {
    const res = await fetch(`/api/products/${payload.rowIndex}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        field: payload.field,
        value: payload.oldValue,
        expectedLinkTitle: payload.expectedLinkTitle,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error ?? `HTTP ${res.status}`);
    }
    mutate('/api/products');
  },
  [mutate],
);

const { history, push, revert } = useEditHistory<ProductFieldPayload>({
  storageKey: 'sheet-admin:edit-history:products',
  buildRevertFn: buildProductRevertFn,
});
```

- [ ] **Step 2: Update `handleProductSaveSuccess` to use `revertPayload`**

Find this inside `handleProductSaveSuccess` (around line 175):

```ts
push({
  rowLabel,
  fieldLabel,
  oldValueDisplay: oldValue,
  newValueDisplay: newValue,
  revertFn: async () => {
    const res = await fetch(`/api/products/${rowIndex}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field, value: oldValue, expectedLinkTitle }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error ?? `HTTP ${res.status}`);
    }
    mutate('/api/products');
  },
});
```

Replace with:

```ts
push({
  rowLabel,
  fieldLabel,
  oldValueDisplay: oldValue,
  newValueDisplay: newValue,
  revertPayload: { rowIndex, field, oldValue, expectedLinkTitle },
});
```

- [ ] **Step 3: Update `handleRevert` type annotation**

Find (around line 197):

```ts
const handleRevert = useCallback(
  async (record: EditRecord) => {
```

Replace with:

```ts
const handleRevert = useCallback(
  async (record: EditRecord<ProductFieldPayload>) => {
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npm run lint`  
Expected: No errors in `app/(app)/products/products-client.tsx`

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/products/products-client.tsx
git commit -m "feat: wire ProductFieldPayload into useEditHistory for products page"
```

---

## Task 4: Update `written-products-client.tsx`

**Files:**
- Modify: `app/(app)/written-products/written-products-client.tsx`

- [ ] **Step 1: Add `WrittenProductPayload` type and update `useEditHistory` call**

Find this line (around line 60):

```ts
const { history, push, revert } = useEditHistory();
```

Replace it with:

```ts
type WrittenProductPayload = {
  rowIndex: number;
  snapshot: Omit<WrittenProduct, 'rowIndex'>;
};

const buildWrittenProductRevertFn = useCallback(
  (payload: WrittenProductPayload) => async () => {
    const res = await fetch(`/api/written-products/${payload.rowIndex}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload.snapshot),
    });
    if (!res.ok) throw new Error(await res.text());
    await mutate('/api/written-products');
  },
  [mutate],
);

const { history, push, revert } = useEditHistory<WrittenProductPayload>({
  storageKey: 'sheet-admin:edit-history:written-products',
  buildRevertFn: buildWrittenProductRevertFn,
});
```

- [ ] **Step 2: Update the `push` call to use `revertPayload`**

Find the `push({...})` call inside the save handler (around line 196):

```ts
push({
  rowLabel,
  fieldLabel: n === 1 ? String(changedFields[0]) : `${n} fields`,
  oldValueDisplay: 'Previous version',
  newValueDisplay: 'Updated',
  revertFn: async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { rowIndex: _rowIndex, ...body } = oldSnapshot;
    const res = await fetch(`/api/written-products/${oldRowIndex}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    await mutate('/api/written-products');
  },
});
```

Replace with:

```ts
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { rowIndex: _rowIndex, ...snapshot } = oldSnapshot;
push({
  rowLabel,
  fieldLabel: n === 1 ? String(changedFields[0]) : `${n} fields`,
  oldValueDisplay: 'Previous version',
  newValueDisplay: 'Updated',
  revertPayload: { rowIndex: oldRowIndex, snapshot },
});
```

- [ ] **Step 3: Update `handleRevert` type annotation**

Find:

```ts
async function handleRevert(record: EditRecord) {
```

Replace with:

```ts
async function handleRevert(record: EditRecord<WrittenProductPayload>) {
```

- [ ] **Step 4: Verify TypeScript compiles and lint passes**

Run: `npm run lint`  
Expected: No errors across all modified files

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/written-products/written-products-client.tsx
git commit -m "feat: wire WrittenProductPayload into useEditHistory for written-products page"
```

---

## Task 5: Manual verification

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`  
Open: `http://localhost:3000/products`

- [ ] **Step 2: Make an edit and verify it appears in history**

Click a product row → edit any field (e.g. Status) → confirm save.  
Click the clock icon (top-right of the toolbar) → history popover should show the edit with a Revert button.

- [ ] **Step 3: Refresh and verify history survives**

Press F5 (hard refresh). Open the history popover — the edit should still appear.

- [ ] **Step 4: Revert after refresh**

Click Revert on the entry. Should succeed with "Reverted" toast and the field should return to its previous value in the sheet.

- [ ] **Step 5: Verify written-products page**

Navigate to the written-products page. Edit a product via the form. Refresh. History popover should show the edit, and Revert should work.

- [ ] **Step 6: Verify session clearing**

Close the browser tab entirely, reopen the app — history popover should be empty (sessionStorage is tab-scoped).

- [ ] **Step 7: Verify 10-item cap**

Make 11 sequential edits. History popover should show exactly 10 entries (oldest dropped).
