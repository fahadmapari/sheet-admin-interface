# Sheet Header Drift Detection — Design Spec

**Date:** 2026-04-15  
**Status:** Approved

---

## Context

The app's column mapping system maps 70 TourProduct fields to Google Sheet columns by index. If someone adds, removes, or renames columns in the "NET RATES" sheet, the mapping silently breaks — products display wrong data with no visible error.

A Settings > Column Mapping tab exists for admins to inspect and adjust mappings, but there is no proactive alert when the sheet changes. This feature adds automatic drift detection: the app detects when sheet row 1 (the header row) differs from a stored baseline, shows a persistent warning banner to admins, and lets an admin confirm they've verified the mapping — saving the new headers as the updated baseline.

---

## Data Model

**New MongoDB collection:** `headercheck` (single singleton document)

```typescript
interface HeaderCheckDoc {
  _id: 'singleton';
  baseline: string[];          // Last-verified sheet row 1 values (up to 70 elements)
  lastChecked: Date;           // Timestamp of most recent comparison run
  status: 'ok' | 'drift';
  driftDetails: {
    changedColumns: {
      colIndex: number;        // 0-based
      colLetter: string;       // e.g. "F"
      baselineValue: string;   // Header value at last verification
      actualValue: string;     // Current sheet header value
    }[];
    detectedAt: Date;
  } | null;
}
```

**First run (no document exists):** Save current sheet row 1 as baseline, `status: 'ok'`. No warning shown.

**Acknowledging drift:** Replace `baseline` with the current sheet row 1, set `status: 'ok'`, clear `driftDetails`.

---

## Check Flow

### Trigger

Inside `GET /api/products` (`app/api/products/route.ts`), after the auth context is built, call `runHeaderCheckIfDue(authContext)` as a fire-and-forget side-effect (does not block or affect the products response).

### `lib/header-check.ts` (new file)

**`runHeaderCheckIfDue(authContext: SheetsAuthContext): Promise<void>`**
1. Read `headercheck` singleton from MongoDB.
2. If document does not exist → fetch row 1, save as baseline with `status: 'ok'`, return.
3. If `lastChecked` is less than 1 hour ago → return early (no-op).
4. Fetch sheet row 1 using the provided auth context (reuses the user OAuth already established in the products request).
5. Compare each element to `baseline`. Collect differences into `changedColumns[]`.
6. If no differences → update `lastChecked`, set `status: 'ok'`, clear `driftDetails`.
7. If differences found → update `lastChecked`, set `status: 'drift'`, write `driftDetails`.
8. Any error (sheet API failure, MongoDB failure) is caught and logged — products response is unaffected.

**`acknowledgeHeaderDrift(adminEmail: string): Promise<void>`**
1. Fetch current sheet row 1 using the service account (no user context needed here — this is an admin action, not a user product fetch).
2. Save as new `baseline`, set `status: 'ok'`, clear `driftDetails`.

### `lib/sheets.ts` addition

Add **`fetchHeaderRow(authContext: SheetsAuthContext): Promise<string[]>`** — fetches only row 1 (`'NET RATES'!A1:BR1`) rather than all rows, for efficiency in the header check.

---

## API Routes

### `GET /api/header-check`
- Auth: any signed-in user (admin check done client-side for display; reading status is harmless)
- No sheet API call — MongoDB read only
- Response: `{ status: 'ok' | 'drift', driftDetails: DriftDetails | null }`

### `POST /api/header-check/acknowledge`
- Auth: admin only
- Calls `acknowledgeHeaderDrift(session.user.email)`
- Response: `{ ok: true }`

---

## UI Changes

### `app/(app)/layout.tsx`
Include `<HeaderDriftBanner isAdmin={isAdmin} />` inside the authenticated layout. The server layout already computes `isAdmin` for the sidebar — pass it as a prop so the banner component skips the SWR fetch entirely for non-admins without an extra client-side session check.

### `components/layout/header-drift-banner.tsx` (new)
- Client component
- SWR hook on `GET /api/header-check` (no polling interval — fetches once on mount; re-validates when products SWR mutates)
- Renders nothing if `status === 'ok'` or user is not admin
- When `status === 'drift'`:

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚠  Sheet column headers have changed since your last verification.  │
│    Please review the column mapping to ensure nothing is misaligned. │
│                                         [Review Column Mapping →]   │
└─────────────────────────────────────────────────────────────────────┘
```

"Review Column Mapping →" navigates to `/settings?tab=column-mapping`.

### `components/settings/column-mapping-settings.tsx` (modified)
- Add SWR hook on `GET /api/header-check`
- When `status === 'drift'`, render an amber alert block above the mapping table:

```
⚠ The following sheet headers have changed:

  Column F  |  Was: "Product Link"  →  Now: "Product URL"
  Column G  |  Was: "Tour Name"     →  Now: "Name"

Review the mapping table below and adjust any affected fields.
Once done, click "Confirm headers verified" to dismiss this warning.

                              [Confirm headers verified]
```

- "Confirm headers verified" button calls `POST /api/header-check/acknowledge`, then invalidates the `GET /api/header-check` SWR key — the banner disappears app-wide.

---

## Files Modified / Created

| File | Change |
|------|--------|
| `lib/header-check.ts` | New — `runHeaderCheckIfDue()`, `acknowledgeHeaderDrift()` |
| `lib/sheets.ts` | Add `fetchHeaderRow()` |
| `app/api/products/route.ts` | Call `runHeaderCheckIfDue()` as side-effect |
| `app/api/header-check/route.ts` | New — GET status |
| `app/api/header-check/acknowledge/route.ts` | New — POST acknowledge |
| `app/(app)/layout.tsx` | Add `<HeaderDriftBanner />` |
| `components/layout/header-drift-banner.tsx` | New — amber warning banner |
| `components/settings/column-mapping-settings.tsx` | Add drift alert + confirm button |

---

## Verification

1. Run `npm run dev`
2. In the sheet, rename any header in row 1 (e.g., column F)
3. Load the products page — this triggers the hourly check (or temporarily lower the cooldown to 0 for testing)
4. Reload — `GET /api/header-check` should return `status: 'drift'` with the changed column listed
5. Confirm the amber banner appears in the app layout for an admin account
6. Navigate to Settings > Column Mapping — confirm the drift details block appears with correct old/new values
7. Click "Confirm headers verified" — banner disappears, re-checking `GET /api/header-check` returns `status: 'ok'`
8. Confirm non-admin accounts do not see the banner
