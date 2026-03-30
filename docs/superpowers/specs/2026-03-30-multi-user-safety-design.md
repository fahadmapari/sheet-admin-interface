# Multi-User Safety & Live Awareness Design

**Date:** 2026-03-30
**Scope:** Safety only + background awareness (Option B from risk analysis)

---

## Problem

The app is used by multiple people simultaneously. Three concrete failure modes exist:

1. **Row-shift corruption** — `deleteRow` shifts all subsequent rows up. Any user with a product open by `rowIndex` will silently write to the wrong row on their next save.
2. **PUT overwrites concurrent PATCH changes** — The full-form save (`PUT`) blindly replaces all 70 columns with whatever the form held in memory. If another user edited a field via inline edit between load and submit, that change is lost.
3. **No live updates** — Each browser holds a stale SWR snapshot. Users never see each other's changes without a manual reload.

---

## Stable Identity Anchor

`productName` is always unique. It is stored as the **text portion of the `link` field** (column F, index 5), formatted as `title||https://...` or just the title when there is no URL. The existing `parseLinkField` utility parses this. Identity is resolved by scanning column F and matching on `.text`.

---

## Architecture

Three independent changes:

### 1. `findRowByProductName` — lib/sheets.ts

New exported helper:

```ts
findRowByProductName(title: string): Promise<number | null>
```

- Fetches column F (`'NET RATES'!F2:F`) as a values range
- For each cell, calls `parseLinkField(cell).text`
- Returns the 1-based `rowIndex` of the first match, or `null` if not found
- Used by both PATCH and PUT before writing

### 2. Write guards — app/api/products/[rowIndex]/route.ts

**PATCH changes:**
- Client sends an additional field: `expectedLinkTitle: string`
- Server calls `findRowByProductName(expectedLinkTitle)` before writing
- If found at a different `rowIndex` than the URL param: writes to the found row instead
- If not found: returns `404 { error: 'product_not_found' }`
- Exception: when `field === 'link'`, identity verification is skipped (the title itself is changing — trust `rowIndex` from URL)

**PUT changes:**
- Server calls `findRowByProductName` using the `link` field's text from the submitted body to confirm/find the real `rowIndex`
- Server fetches the current full row from the sheet (`fetchRow`)
- Server merges: current sheet row is the base, submitted body fields overlay it
- Writes merged row back to the confirmed `rowIndex`
- If product not found: returns `404 { error: 'product_not_found' }`

### 3. SWR polling — app/products/products-client.tsx

```ts
useSWR<TourProduct[]>('/api/products', fetcher, {
  refreshInterval: 30_000,
  dedupingInterval: 60_000,
})
```

No other client changes. SWR's default `revalidateOnFocus: true` is kept.

---

## Client Changes

**`inline-edit-cell.tsx`** — PATCH body gains one field:

```ts
body: JSON.stringify({ field, value: valueToSave, expectedLinkTitle: parseLinkField(product.link ?? '').text })
```

Same for `LinkEditCell`'s save function.

**`product-detail-tabs.tsx`** — No change to the PUT body. The server derives identity from the submitted `link` field. On 404 response, show toast error and call `mutate('/api/products')`.

---

## Error Handling

| Situation | Server response | Client behavior |
|---|---|---|
| Product not found (deleted by someone else) | `404 { error: 'product_not_found' }` | Toast error + `mutate('/api/products')` |
| Row shifted — product found at new row | `200 ok` (write redirected silently) | Normal optimistic update |
| Link field being edited | Identity check skipped, `rowIndex` trusted | Normal save |
| Product has no link title | Falls back to `rowIndex` (no regression) | Normal save |
| Sheets API failure on pre-read | `500` | Toast error, no data written |
| Two simultaneous PUTs | Last write wins (narrow window) | Acceptable, pre-existing behavior |

---

## Out of Scope

- Conflict warnings / stale-write detection (Option C)
- Realtime push (WebSockets, Server-Sent Events)
- Locking / pessimistic concurrency
- Bulk PATCH identity verification (low risk — bulk edits target a specific field by explicit selection)

---

## Files Changed

| File | Change |
|---|---|
| `lib/sheets.ts` | Add `findRowByProductName` |
| `app/api/products/[rowIndex]/route.ts` | Guard PATCH with identity check; change PUT to read-merge-write |
| `app/products/products-client.tsx` | Add `refreshInterval: 30_000` |
| `components/products/inline-edit-cell.tsx` | Pass `expectedLinkTitle` in PATCH body |
| `components/products/product-detail-tabs.tsx` | Handle 404 on PUT response |
