# Written Products Table Virtualization

**Date:** 2026-04-17  
**Status:** Approved

## Problem

`WrittenProductTable` renders every filtered row at once using `table.getRowModel().rows.map(...)`. With hundreds to low-thousands of rows the DOM grows large, causing slow initial paint and laggy scrolling.

## Solution

Apply `@tanstack/react-virtual` row virtualization — the same pattern already used in `product-table.tsx`. Only rows in (or near) the viewport are rendered.

## Files Changed

### `components/written-products/written-product-table.tsx`

- Add `containerRef = useRef<HTMLDivElement>(null)` 
- Add `useVirtualizer({ count: rows.length, getScrollElement: () => containerRef.current, estimateSize: () => 41, overscan: 10 })`
- Outer `<div>`: change `className="w-full overflow-auto"` → add `ref={containerRef}` and `className="h-full overflow-auto"`
- `<thead>`: add `sticky top-0 z-10 bg-[hsl(var(--background))]`
- `<tbody>`: replace `rows.map(...)` with virtualizer pattern — padding spacer rows + `virtualRows.map(vr => rows[vr.index])`, each `<tr>` gets `data-index={vr.index}` and `ref={virtualizer.measureElement}`
- Empty-state row remains as a plain fallback when `rows.length === 0`

### `app/(app)/written-products/written-products-client.tsx`

- Line 132: change `<div className="flex-1 overflow-auto">` → `<div className="flex-1 overflow-hidden min-h-0">` so the table component receives full height and owns the scroll

## Row Height Estimate

`41px` — `py-2` top+bottom (16px) + `text-sm` line height (~20px) + border (1px) ≈ 37–41px. `measureElement` corrects any mismatch after first render.

## No-Op Cases

- Filters reduce list to 0 rows: empty-state renders normally, virtualizer has count 0
- Loading/error states: handled in client before `WrittenProductTable` is mounted

## Dependencies

`@tanstack/react-virtual` v3 is already installed. No new dependencies.
