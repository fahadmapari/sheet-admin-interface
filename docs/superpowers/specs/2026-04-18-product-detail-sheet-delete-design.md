# Product Detail Sheet — Delete Option

**Date:** 2026-04-18

## Goal

Add a Delete button to the `ProductDetailSheet` footer so users can remove a single product row from Google Sheets without leaving the sheet panel.

## Approach

Option A: destructive Delete button in the existing footer row, always visible. Reuses `DeleteConfirmDialog` and `DELETE /api/products/bulk`.

## Changes

### `components/products/product-detail-sheet.tsx`

- Add `onDeleted?: () => void` to `ProductDetailSheetProps`.
- Add `deleteDialogOpen` boolean state.
- Add `handleDelete` async function:
  - Calls `DELETE /api/products/bulk` with `{ rowIndexes: [draftProduct.rowIndex] }`.
  - On success: `toast.success`, call `onDeleted?.()`, call `onOpenChange(false)`.
  - On error: `toast.error('Delete failed')`.
- Footer: add `<Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>Delete</Button>` to the left of the Close button.
- Render `<DeleteConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} count={1} onConfirm={handleDelete} />` alongside the existing `MoveToStageDialog`.

### `app/(app)/products/products-client.tsx`

- Pass `onDeleted={() => { setSelectedProduct(null); mutate('/api/products'); }}` to `<ProductDetailSheet>`.

### `app/(app)/assembly/assembly-client.tsx`

- No change required; `onDeleted` is optional.

## Error Handling

- API failure shows `toast.error('Delete failed')` and leaves the sheet open.
- The confirm dialog's loading state (`isDeleting`) prevents double-submit.

## Out of Scope

- No undo / soft-delete.
- No changes to the bulk delete path.
