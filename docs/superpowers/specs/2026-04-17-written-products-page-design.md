# Written Products Page Design

**Date:** 2026-04-17  
**Status:** Approved

## Overview

Add a new "Written Products" page at `/written-products` that provides full CRUD management for a separate Google Sheets document containing a list of written tour products. The page mirrors the products page architecture (Option A: parallel implementation) but with a simpler feature set: search, filters, CRUD, and export to Google Sheets — no assembly integration, no shareables, no column group/mapping config.

## Data Source

- **Separate spreadsheet** pointed to by a new env var `WRITTEN_PRODUCTS_SPREADSHEET_ID`
- Sheet has a header row (row 1) and data rows starting at row 2
- 13 active columns (A–M), plus one trailing empty column that is ignored
- User OAuth is used for all reads/writes (same pattern as products)

## Data Model

New `WrittenProduct` type added to `lib/types.ts`:

```ts
export interface WrittenProduct {
  rowIndex: number;       // 1-based sheet row number
  country: string;        // A
  cityDestination: string; // B
  state: string;          // C
  tourType: string;       // D
  textLink: string;       // E — primary display identifier
  ccOk: boolean;          // F
  isOk: boolean;          // G
  rrOk: boolean;          // H
  ssOk: boolean;          // I
  contentExist: boolean;  // J
  b2b: boolean;           // K
  b2c: boolean;           // L
  ssNotes: boolean;       // M
}
```

`textLink` is the primary identifier column (displayed as the row name in the table).

## Environment Variables

```env
WRITTEN_PRODUCTS_SPREADSHEET_ID=   # ID of the separate Written Products Google Sheet
```

## Utility Layer

New file `lib/written-products-utils.ts`:
- `rowToWrittenProduct(row: string[], rowIndex: number): WrittenProduct` — maps a raw sheet row array to the type
- `writtenProductToRow(product: Omit<WrittenProduct, 'rowIndex'>): string[]` — maps the type back to a row array for writing

No column mapping config — columns are fixed (indices 0–12 map directly to fields).

Boolean cells are stored as `TRUE`/`FALSE` strings in Sheets and parsed accordingly.

## API Routes

All routes live under `app/api/written-products/` and use user OAuth via `requireGoogleAccessToken()`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/written-products` | Fetch all rows, return `WrittenProduct[]` |
| POST | `/api/written-products` | Append new row, return created `WrittenProduct` |
| GET | `/api/written-products/[rowIndex]` | Fetch single row by 1-based row index |
| PUT | `/api/written-products/[rowIndex]` | Update row in-place |
| DELETE | `/api/written-products/[rowIndex]` | Delete row via `deleteDimension` batchUpdate |

The delete route cannot reuse `deleteRow()` from `lib/sheets.ts` because `getSheetId()` caches by sheet name only and always resolves against `SPREADSHEET_ID`. Instead, the written products delete route calls the Sheets `batchUpdate` API directly with `WRITTEN_PRODUCTS_SPREADSHEET_ID`, fetching the sheet ID inline (or caching it with its own cache keyed by `spreadsheetId + sheetName`).

## Page Structure

```
app/(app)/written-products/
  page.tsx                        # Server component, passes searchParams
  loading.tsx                     # Skeleton loader
  written-products-client.tsx     # Main client component
  [rowIndex]/
    page.tsx                      # Edit page for a single row
```

```
components/written-products/
  written-product-table.tsx       # TanStack table, 13 columns
  written-product-form.tsx        # Create/edit form
  written-product-detail-sheet.tsx # Slide-in edit panel
  written-product-filter-bar.tsx  # Country + tourType filters + search
  written-product-export-button.tsx # Export to Google Sheet in user's Drive
```

## UI Details

**Table columns:**
- `textLink` — primary name column (leftmost, always visible)
- `country`, `cityDestination`, `state`, `tourType` — standard text columns
- `ccOk`, `isOk`, `rrOk`, `ssOk`, `contentExist`, `b2b`, `b2c`, `ssNotes` — rendered as colored badges: green check for `true`, gray dash for `false`

**Filters:**
- Search input: matches `textLink`, `country`, `cityDestination` (client-side)
- `country` multi-select (options derived from loaded data)
- `tourType` multi-select (options derived from loaded data)

**Forms:**
- 5 text inputs: `country`, `cityDestination`, `state`, `tourType`, `textLink`
- 8 checkboxes: `ccOk`, `isOk`, `rrOk`, `ssOk`, `contentExist`, `b2b`, `b2c`, `ssNotes`

**Detail sheet:** Slide-in panel (same as `ProductDetailSheet`) for viewing/editing a row inline without navigating away. The `[rowIndex]/page.tsx` edit page is the full-page fallback.

**Export:** Copies current filtered data to a new Google Sheet in the user's Drive, using the user's OAuth access token.

## Navigation

Add to `components/layout/sidebar.tsx`:
```ts
{ href: '/written-products', label: 'Written Products', icon: FileText }
```
Inserted after the existing "Products" nav item.

## Excluded Features

The following features from the products page are intentionally omitted:
- Assembly line integration
- Shareables / shareable links
- Column group configuration
- Column display name mapping / remapping
- Card view (table-only)
- Fullscreen mode

## Error Handling

- Missing `WRITTEN_PRODUCTS_SPREADSHEET_ID` env var → API routes return 500 with a clear message
- `GoogleAccessTokenError` → same 401 handling as products routes
- Row not found → 404
