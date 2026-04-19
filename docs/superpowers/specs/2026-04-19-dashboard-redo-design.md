# Dashboard Redo — Design Spec

**Date:** 2026-04-19
**Status:** Approved

## Overview

Redo the dashboard to cover both Products and Written Products on a single unified page with a clear visual separator between the two sections. Remove PIC Workload and OTA Coverage charts from the Products section.

## Page Structure

Single scrollable page at `app/(app)/page.tsx`. Two visually separated sections, each with a heading acting as a divider.

```
── Products ──────────────────────────────────────────────────
  KPI row: Total | Ready for Upload | Uploaded | In Progress | High Priority | Completed | On Hold
  Charts (2-col grid):
    - Products by Country
    - Products by Type
    - Products by Status
    - Upload Progress

── Written Products ──────────────────────────────────────────
  KPI row: Total | contentExist | b2b | b2c
  Charts (2-col grid):
    - Content Completion  (progress bars: ccOk, isOk, rrOk, ssOk, contentExist, ssNotes)
    - Channel Coverage    (progress bars: b2b, b2c)
```

## Data Fetching

`app/(app)/page.tsx` fetches both datasets in parallel using `Promise.all`:
- `TourProduct` rows via `fetchAllRows` (existing, user OAuth)
- `WrittenProduct` rows via `fetchAllWrittenProductRows` + `getEffectiveWrittenColumnMap` + `rowToWrittenProduct` (same pattern as `app/api/written-products/route.ts`)

Both are mapped to typed arrays and passed as props to `DashboardClient`.

## Components

### Changes to existing files

**`components/dashboard/dashboard-client.tsx`**
- Accept new prop `writtenProducts: WrittenProduct[]`
- Render Products section with existing KPI cards and charts
- Add section divider (heading + horizontal rule)
- Render Written Products section with 4 KPI cards and 2 new charts
- Remove `PicWorkload` and `OtaCoverage` from render

**`components/dashboard/charts.tsx`**
- Remove `PicWorkload` export
- Remove `OtaCoverage` export

### New file

**`components/dashboard/written-products-charts.tsx`**

Two components, both reuse the same progress bar markup pattern as the existing `UploadProgress` component:

**`WrittenContentCompletion`**
- Props: `writtenProducts: WrittenProduct[]`
- Progress bars for: ccOk, isOk, rrOk, ssOk, contentExist, ssNotes
- Each bar shows: count / total (percentage%)

**`WrittenChannelCoverage`**
- Props: `writtenProducts: WrittenProduct[]`
- Progress bars for: b2b, b2c
- Each bar shows: count / total (percentage%)

### Written Products KPI Cards

| Title | Value | Tone |
|---|---|---|
| Total Written Products | total | default |
| Content Exists | contentExist count | success |
| B2B | b2b count | info |
| B2C | b2c count | info |

## Removed Charts

- `PicWorkload` — removed from dashboard and `charts.tsx`
- `OtaCoverage` — removed from dashboard and `charts.tsx`

## Non-Goals

- No new API routes (data fetched server-side in the page component)
- No changes to Written Products list page or detail page
- No changes to KpiCard component
