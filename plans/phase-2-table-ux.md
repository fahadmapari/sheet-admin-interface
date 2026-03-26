# Phase 2 — Table UX (Column Groups, Visibility, Virtual Scroll, Sort/Filter, Search, Sticky)

## Status at start of this phase
- ✅ Next.js 14 scaffold
- ✅ Google Sheets API wrapper (`lib/sheets.ts`)
- ✅ Type definitions (`lib/types.ts`, `lib/constants.ts`, `lib/utils.ts`)
- ✅ API routes: GET /api/products, GET /api/filters, GET /api/stats, GET /api/inventory-update
- ✅ Basic products table (read-only, all 70 columns, sidebar layout)
- **Tasks 6–11 begin here**

## Context

Working directory: `e:/projects/sheet-admin`
Framework: Next.js 14 App Router, TypeScript strict, Tailwind CSS, shadcn/ui (New York/Zinc)
Packages already installed: `@tanstack/react-table`, `@tanstack/react-virtual`, `swr`

The products table lives at `components/products/product-table.tsx`.
The table is already functional (Phase 1b) but has no virtual scrolling, no column visibility toggles, no collapsible column groups, no proper filter bar, and no global search.

This phase upgrades the table to production quality. Work inside `components/products/` and `app/products/page.tsx`.

Run `npm install` if node_modules is missing. TypeScript must stay clean (`npx tsc --noEmit`).

---

## Task 6 — Column Groups with Collapsible Sections

Upgrade the TanStack Table header to display columns in **collapsible groups**. Each group has a header cell that spans its columns. Clicking the group header collapses/expands all columns in that group (except the first two sticky columns — Country and City are always visible).

### Implementation

Use TanStack Table's `columnGroups` feature. In the `useReactTable` config, structure columns as:

```typescript
const columns = [
  // === Group: Location & Identity ===
  columnHelper.group({
    id: 'location',
    header: 'Location & Identity',
    columns: [
      columnHelper.accessor('country', { ... }),
      columnHelper.accessor('city', { ... }),
      columnHelper.accessor('department', { ... }),
      columnHelper.accessor('region', { ... }),
      columnHelper.accessor('productType', { ... }),
    ],
  }),
  // ... repeat for all 11 groups from COLUMN_GROUPS in constants.ts
]
```

The groups match the 11 groups defined in `COLUMN_GROUPS` in `lib/constants.ts`.

**Collapse state:** Use `useState<Record<string, boolean>>` to track which group IDs are collapsed. When collapsed, hide all columns in that group except pinned ones (Country, City).

**Group header cell UI:**
- Show group label + chevron icon (rotates when collapsed)
- Clicking toggles the group
- Use `colSpan` equal to the number of visible columns in the group
- Style: slightly darker background than regular header, bold text

**Column header cell UI:**
- Show field label from `FIELD_LABELS`
- Show sort indicator (▲/▼) when sorted
- Click to sort

**Commit message:** `feat: collapsible column groups in products table`

---

## Task 7 — Column Visibility Toggle + View Presets

Add a **column visibility panel** that lets users show/hide individual columns, and **view preset buttons** that activate predefined column sets.

### Files to create
- `components/products/column-visibility.tsx`

### `components/products/column-visibility.tsx`

A dropdown/popover that shows:
1. **View preset buttons** at the top — "Overview", "Pricing", "OTA", "Upload Workflow", "Tour Details", "All Columns"
2. **Grouped checkboxes** below — one checkbox per column, grouped by the 11 column groups
3. A "Reset to All" button at the bottom

Use `Popover` + `PopoverTrigger` + `PopoverContent` from shadcn/ui.
Use `Checkbox` from shadcn/ui for each column toggle.

Connect to TanStack Table's `table.getColumn(id)?.toggleVisibility()` and `table.setColumnVisibility()`.

The preset definitions are in `VIEW_PRESETS` from `lib/constants.ts`. When a preset is selected, call `table.setColumnVisibility()` with an object where:
- preset fields → `true`
- all other fields → `false`
- `country` and `city` always stay `true` (they're sticky)

### Integration

Add the column visibility toggle button to `app/products/page.tsx` in the toolbar area (top-right of the page header). It should look like a "Columns" button with a `Columns` icon from lucide-react.

**Commit message:** `feat: column visibility toggle and view presets`

---

## Task 8 — Virtual Scrolling for Performance

Replace the plain overflow scroll with **TanStack Virtual** to render only visible rows. This is critical for ~2,950 rows.

### Implementation

In `components/products/product-table.tsx`:

1. Add `useVirtualizer` from `@tanstack/react-virtual`
2. Create a `parentRef` for the scrollable container div
3. Create a row virtualizer:

```typescript
const rowVirtualizer = useVirtualizer({
  count: table.getRowModel().rows.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 36, // row height in px
  overscan: 20,
});
```

4. Render only `rowVirtualizer.getVirtualItems()` rows
5. Add a spacer div for total height:

```tsx
<div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
  {rowVirtualizer.getVirtualItems().map(virtualRow => {
    const row = rows[virtualRow.index];
    return (
      <tr
        key={row.id}
        style={{
          position: 'absolute',
          top: 0,
          transform: `translateY(${virtualRow.start}px)`,
          width: '100%',
        }}
      >
        ...
      </tr>
    );
  })}
</div>
```

6. The table `<tbody>` must use `position: relative` to contain the absolute rows.

**Important:** The sticky columns (Country, City) must still work with virtual scrolling. Keep their `position: sticky; left: 0` styles.

**Commit message:** `feat: virtual scrolling for products table (TanStack Virtual)`

---

## Task 9 — Sorting and Filtering

### Sorting

Already partially done (click header → sort). Make sure:
- Multi-column sort is disabled (single column sort only)
- Sort icons show clearly in the header: `ChevronUp` for asc, `ChevronDown` for desc, `ChevronsUpDown` for unsorted
- `getSortedRowModel()` is wired in `useReactTable`

### Filter Bar

Create `components/products/filter-bar.tsx`.

The filter bar sits below the page header and above the table. It contains:
1. **Country** — `Select` or `Combobox` (autocomplete for 42 values), fetched from `/api/filters`
2. **City** — `Select` or `Combobox`
3. **Product Type** — multi-select (46 values)
4. **Product Status** — multi-select (5 values): In Progress, Completed, In Progress - High priority, On hold, Ignored
5. **PIC** — multi-select (10 values): CM, LG, DS, CC, DV, SB, IS, Hanieh, RB
6. **Ready for Upload** — toggle group: All | Yes | No
7. A **Clear All** button that resets all filters

Fetch filter options from `/api/filters` with SWR.

**Filter logic (client-side):** Filters are applied to the data returned from `/api/products` in memory. Use TanStack Table's `getFilteredRowModel()` + `columnFilters` state, OR filter the data array before passing to `useReactTable`.

Recommended approach: maintain a `filters` state object in the page component, pass filtered data to the table:

```typescript
const filteredProducts = useMemo(() => {
  return products.filter(p => {
    if (filters.country && p.country !== filters.country) return false;
    if (filters.city && p.city !== filters.city) return false;
    if (filters.productTypes.length && !filters.productTypes.includes(p.productType)) return false;
    if (filters.statuses.length && !filters.statuses.includes(p.productStatus ?? '')) return false;
    if (filters.pics.length && !filters.pics.includes(p.pic ?? '')) return false;
    if (filters.readyForUpload === 'yes' && !p.readyForUpload) return false;
    if (filters.readyForUpload === 'no' && p.readyForUpload) return false;
    return true;
  });
}, [products, filters]);
```

Show the row count: `Showing X of Y products` in the top bar.

**Commit message:** `feat: filter bar and sorting for products table`

---

## Task 10 — Global Search

Add a **global search input** to the page header that searches across key text columns.

### Implementation

Search across: `country`, `city`, `productName`, `link`, `notes`, `productType`.

```typescript
const searchedProducts = useMemo(() => {
  if (!globalSearch.trim()) return filteredProducts;
  const q = globalSearch.toLowerCase();
  return filteredProducts.filter(p =>
    [p.country, p.city, p.productName, p.link, p.notes, p.productType]
      .some(v => v?.toLowerCase().includes(q))
  );
}, [filteredProducts, globalSearch]);
```

- Place the search `<Input>` with a `Search` icon in the page header toolbar
- Show result count updates in real time
- Debounce the search input by 200ms (use a simple `useEffect` + `setTimeout` pattern)
- Clear button (X) appears when there is search text

**Commit message:** `feat: global search for products table`

---

## Task 11 — Sticky Columns (Country, City) + Sticky Header

Make sure the following work correctly together with virtual scrolling from Task 8:

### Sticky Header
- The `<thead>` element (both the group header row and the column header row) must be `position: sticky; top: 0; z-index: 20`
- Background must be opaque (white) so content scrolls under it

### Sticky Country Column (Col 0)
```css
position: sticky;
left: 0;
z-index: 10;
background: white; /* opaque, matches row background */
```

### Sticky City Column (Col 1)
```css
position: sticky;
left: 120px; /* = width of Country column */
z-index: 10;
background: white;
```

### Shadow on sticky columns
Add a subtle right-side box shadow to the City column to visually separate it from scrollable columns:
```css
box-shadow: 2px 0 4px rgba(0,0,0,0.06);
```

### Notes
- Both sticky columns must have matching background in header and body rows (alternating row colours if any must apply to sticky cells too)
- The sticky header group row and column row must also have sticky Country/City cells with `z-index: 30` (higher than body sticky)
- Verify the sticky columns don't "un-stick" during virtual scroll — the sticky CSS works independently of the virtual scroll translateY

**Commit message:** `feat: sticky header and sticky Country/City columns`

---

## Verification

After all tasks in this phase:
1. `npx tsc --noEmit` — must pass with zero errors
2. `npm run build` — must succeed
3. Manual check (if possible): `npm run dev` → products page renders correctly with all column groups, filter bar, search, sticky columns
4. Virtual scrolling must not crash with 0 rows (empty/loading state)
