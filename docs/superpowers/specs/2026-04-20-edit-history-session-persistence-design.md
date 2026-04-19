# Edit History Session Persistence

**Date:** 2026-04-20  
**Status:** Approved

## Problem

`useEditHistory` stores edit records in React `useState`. Navigating away or refreshing the page wipes the entire history, including the ability to revert changes. Users lose their revert capability the moment the page reloads.

## Goal

Persist the edit history (including revert capability) across page refreshes for the duration of the browser session (cleared when the tab closes).

## Constraints

- `revertFn` is a closure — it captures runtime values (`mutate`, product data) and cannot be serialized.
- The hook is used in two places with different revert logic: `products-client.tsx` (field-level PATCH) and `written-products-client.tsx` (full-record PUT).
- The hook must stay decoupled from application domain types.

## Chosen Approach: Serializable Revert Payload

Each edit record stores a plain-JSON `revertPayload` alongside the runtime `revertFn`. The hook receives a `buildRevertFn` factory from the caller. On mount, the hook loads stored records from `sessionStorage`, calls `buildRevertFn(payload)` for each to reconstruct `revertFn`, and hydrates state. Revert works fully after refresh.

## Data Model

### `EditRecord<P>`

```ts
type EditRecord<P = unknown> = {
  id: string;
  rowLabel: string;
  fieldLabel: string;
  oldValueDisplay: string;
  newValueDisplay: string;
  timestamp: number;
  revertPayload: P;           // serialized to sessionStorage
  revertFn: () => Promise<void>; // runtime only, never stored
};
```

### Stored shape (sessionStorage value)

The hook omits `revertFn` before writing:

```ts
type StoredRecord<P> = Omit<EditRecord<P>, 'revertFn'>;
```

One key per page: e.g. `sheet-admin:edit-history:products`.

### Payload types (defined at call sites)

```ts
// products-client.tsx
type ProductFieldPayload = {
  rowIndex: number;
  field: string;
  oldValue: string;
  expectedLinkTitle: string;
};

// written-products-client.tsx
type WrittenProductPayload = {
  rowIndex: number;
  snapshot: Omit<WrittenProduct, 'rowIndex'>;
};
```

## Hook Interface

```ts
function useEditHistory<P>(options: {
  storageKey: string;
  buildRevertFn: (payload: P) => () => Promise<void>;
}): {
  history: EditRecord<P>[];
  push: (record: Omit<EditRecord<P>, 'id' | 'timestamp' | 'revertFn'>) => void;
  revert: (record: EditRecord<P>) => Promise<void>;
};
```

Key changes from current:
- Hook is now generic over `P`.
- Accepts `storageKey` and `buildRevertFn` options.
- `push` no longer accepts `revertFn` — it derives it from `buildRevertFn(revertPayload)`.
- `revert` removes the record from sessionStorage after success.

### Lifecycle

**On mount** (single `useEffect` with no deps re-run):
1. Read `sessionStorage.getItem(storageKey)`.
2. Parse JSON; on any error, clear the key and start with empty state.
3. For each stored record, call `buildRevertFn(record.revertPayload)` to produce `revertFn`.
4. Set state with the reconstructed records.

**On push**:
1. Build full record: `{ ...input, id: nanoid(), timestamp: Date.now(), revertFn: buildRevertFn(input.revertPayload) }`.
2. Prepend to state, cap at `MAX_HISTORY = 10`.
3. Write updated list (without `revertFn`) to `sessionStorage`.

**On revert**:
1. Call `record.revertFn()` — throws on failure; caller handles.
2. Remove the record from state.
3. Remove the record from sessionStorage.

### `buildRevertFn` stability

Callers must wrap `buildRevertFn` in `useCallback`. Since `mutate` from SWR is a stable reference, the factory reference will be stable in practice. The hook stores `buildRevertFn` in a `useRef` so the latest version is always used at call time without causing re-renders.

## Files Changed

| File | Change |
|---|---|
| `lib/hooks/use-edit-history.ts` | Add generics, `storageKey`, `buildRevertFn`, sessionStorage read/write |
| `app/(app)/products/products-client.tsx` | Define `ProductFieldPayload`, update `useEditHistory` call and `push` call |
| `app/(app)/written-products/written-products-client.tsx` | Define `WrittenProductPayload`, update `useEditHistory` call and `push` call |

`EditHistoryPopover` and `MAX_HISTORY` are unchanged.

## Error Handling

- Corrupt/unparseable sessionStorage data: catch, clear the key, start fresh (no crash).
- `buildRevertFn` called with a stale payload after schema changes: revert may fail at the API level — same error path as today (toast "Revert failed, try again").

## Testing Considerations

- After making an edit, refresh the page — history popover should show the edit with a working Revert button.
- Reverting after refresh should patch/put the correct values and show the success toast.
- Closing the tab and reopening should start with empty history (sessionStorage scope).
- Making more than 10 edits should evict the oldest, matching current in-memory behaviour.
