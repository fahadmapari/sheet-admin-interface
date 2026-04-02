# Assembly Line Feature — Design Spec

**Date:** 2026-04-02  
**Status:** Approved

---

## Overview

An assembly line page that tracks tour products through a defined sequence of production stages. Stages are stored in MongoDB (independent from the Google Sheet), except for the "Ready for Upload" stage which also syncs `readyForUpload = true` back to the sheet. Products are grouped into **batches** within each stage for visibility and bulk management.

---

## Stages (ordered)

1. In Review
2. 2nd Review
3. Buying Price
4. Selling Price
5. Ready for Upload
6. Uploaded

A product can only be in **one stage at a time**. Moving it to a new stage removes it from its current one. A product not yet in any stage is treated as untracked; the "next stage" for it is "In Review".

---

## Data Model

### MongoDB Collection: `assembly_batches`

```ts
{
  _id: ObjectId,
  name: string,           // auto: ISO date "2026-04-02", or user-provided on bulk move
  stage: AssemblyStage,   // one of the 6 stage values
  productRowIndexes: number[],  // sheet rowIndex values (1-based)
  createdAt: Date,
}
```

**Key behaviors:**
- One document = one batch.
- A batch belongs to exactly one stage.
- When a product is moved, it is pulled from its current batch's `productRowIndexes` array and pushed into the target batch's array (two atomic writes). Empty batches are deleted automatically.
- On bulk move, the user can create a new batch (custom or date-named) or append to an existing batch in the target stage.

### MongoDB connection

Singleton client at `lib/mongodb.ts`. URI read from `MONGODB_URI` env var.

---

## API Routes (`/api/assembly`)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/assembly` | Fetch all batches, grouped by stage. Used by the assembly page. |
| `POST` | `/api/assembly/move` | Move one or more products to a stage. Handles batch creation/append. Syncs sheet if target is "Ready for Upload". |
| `GET` | `/api/assembly/product/[rowIndex]` | Get the current stage and batch for a single product. Used by the detail sheet to display current position and compute next stage. |

### `POST /api/assembly/move` request body

```ts
{
  rowIndexes: number[],
  targetStage: AssemblyStage,
  batchStrategy: 
    | { type: 'new'; name?: string }       // name defaults to today's ISO date
    | { type: 'existing'; batchId: string }
}
```

### `GET /api/assembly` response shape

```ts
{
  [stage: AssemblyStage]: {
    batches: {
      _id: string,
      name: string,
      createdAt: string,
      productRowIndexes: number[],
    }[]
  }
}
```

---

## Assembly Page (`/assembly`)

**Route:** `app/assembly/page.tsx` + `app/assembly/assembly-client.tsx`  
**Sidebar entry:** Added to the "Workspace" nav group as "Assembly Line" (Layers icon), between Products and Settings.

### Layout

- Vertical list of 6 stage sections, each collapsible.
- Stage header: stage name + total product count across all its batches.
- Inside each stage: list of batch cards.

### Batch Card

Displays:
- Batch name
- Date created
- Product count badge
- Expand/collapse toggle

When expanded, shows a compact table of products with columns: product name, city, country, status badge. Each row is clickable and opens the existing product detail sheet.

### Data Loading

Single SWR call to `GET /api/assembly` on mount. Client groups batches by stage in the fixed stage order. Revalidates after any move action.

---

## Move Controls — 3 Entry Points

### 1. Product Detail Sheet

Location: before the Close (X) button in the sheet header.

- **Split button:** Left side = "Move to Next Stage" (auto-advances one step; first stage if untracked). Right side = dropdown chevron to select any stage manually.
- A small label below shows "Currently in: [Stage]" if the product is already tracked, or nothing if untracked.
- On move: toast confirmation. Sheet stays open.
- Button state fetched via `GET /api/assembly/product/[rowIndex]` when the sheet opens.

### 2. Table Row 3-Dots Menu

Location: existing `DropdownMenu` in `product-table.tsx`.

- New menu item: "Move to Next Stage".
- Always advances to the next stage in sequence (or "In Review" if untracked).
- No stage picker — keeps the menu simple. Manual selection available via the detail sheet.
- Batch strategy for single moves (both table 3-dots and detail sheet): append to the most recent batch for that stage dated today, or create a new date-named batch if none exists.
- On move: toast confirmation, table data revalidates.

### 3. Bulk Actions Toolbar

Location: existing `BulkActionsToolbar` in `bulk-actions-toolbar.tsx`.

- New "Move to Stage →" dropdown listing all 6 stages.
- On selecting a stage, a dialog appears with:
  - **New batch** option: text field pre-filled with today's ISO date, editable.
  - **Add to existing batch** option: dropdown of existing batches in the target stage (empty if none exist).
- Confirm executes `POST /api/assembly/move` with all selected row indexes.
- On success: toast, selection cleared, table revalidates.

---

## Sheet Sync

When the target stage is "Ready for Upload":
- After writing to MongoDB, the API also calls the existing bulk sheet update to set `readyForUpload = TRUE` for all moved row indexes.
- This is the only stage that triggers a sheet write.

---

## Environment

Add to `.env.local`:
```
MONGODB_URI=your-mongodb-connection-string
```

---

## File Touchpoints

| File | Change |
|------|--------|
| `lib/mongodb.ts` | New — MongoDB singleton client |
| `lib/types.ts` | Add `AssemblyStage` type, `AssemblyBatch` interface |
| `app/assembly/page.tsx` | New — page entry |
| `app/assembly/assembly-client.tsx` | New — main client component |
| `app/api/assembly/route.ts` | New — GET handler |
| `app/api/assembly/move/route.ts` | New — POST handler |
| `app/api/assembly/product/[rowIndex]/route.ts` | New — GET handler |
| `components/assembly/stage-section.tsx` | New — collapsible stage section |
| `components/assembly/batch-card.tsx` | New — expandable batch card |
| `components/assembly/move-to-stage-dialog.tsx` | New — bulk move dialog |
| `components/products/product-detail-sheet.tsx` | Add split-button move control |
| `components/products/product-table.tsx` | Add "Move to Next Stage" to 3-dots menu |
| `components/products/bulk-actions-toolbar.tsx` | Add "Move to Stage" dropdown + dialog trigger |
| `components/layout/sidebar.tsx` | Add Assembly Line nav item |
