# Responsive Design — Systematic Pass

**Date:** 2026-04-12  
**Scope:** Option B — Systematic responsive pass for all screens  
**Target:** iPhone 14 (390px) and up  
**Priority:** Mobile is "nice to have" — all pages must be functional, not redesigned

---

## Context

The app already has a working mobile shell:
- Sidebar hidden on mobile, exposed via hamburger + Sheet drawer in the header
- Dashboard KPI grid and charts already use responsive Tailwind grid classes
- Filter bar uses a Sheet drawer on mobile
- Product detail sheet is full-width on mobile

The gaps are in dense data areas: the products table, assembly batch cards, settings tabs, and a handful of overflow/spacing issues across all screens.

---

## Section 1: Layout & Shell

**Status:** No structural changes needed.

- Sidebar shell is already correct (`hidden md:flex` + `MobileSidebar` Sheet)
- Header breadcrumb already handles overflow (`overflow-x-auto whitespace-nowrap`)
- Main content container: reduce `px-6` to `px-3 sm:px-6` and `py-6` to `py-4 sm:py-6` to reclaim horizontal space on 390px

**Files:** `app/(app)/layout.tsx`

---

## Section 2: Products Page

### Default view on mobile
- Initialize `activeView` state to `'cards'` when `window.innerWidth < 768` (the `md` breakpoint)
- Use a `useEffect` that runs once on mount to detect screen size and set the default
- The table remains accessible via the view toggle — this is just a smarter default

### Products table
- Wrap the `ProductTable` render in an `overflow-x-auto` container
- Add `min-w-[640px]` to the `<table>` element so columns don't collapse below a usable width
- The existing `overflow-auto` on the virtualizer container already handles vertical scroll

### Bulk actions toolbar
- Audit `components/products/bulk-actions-toolbar.tsx` for fixed widths or non-wrapping button rows
- Apply `flex-wrap` to the actions row so buttons reflow to a second line on narrow screens

### Product detail sheet footer
- Current: `flex items-center justify-between` — clips on mobile for long stage names like "Move to Ready for Upload"
- Change to: `flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`
- Assembly info (row number + current stage) renders on top; action buttons below on mobile

**Files:**
- `app/(app)/products/products-client.tsx`
- `components/products/product-table.tsx`
- `components/products/bulk-actions-toolbar.tsx`
- `components/products/product-detail-sheet.tsx`

---

## Section 3: Assembly Page

### Batch card header row
- Current row: `[chevron] [icon] [name] [date label] [badge] [Move to X | dropdown]`
- On 390px, "Move to Ready for Upload" overflows the row
- Fix:
  - Hide date label on mobile: `hidden sm:inline` on the date `<span>`
  - Shorten button text on mobile: wrap stage name in `<span className="hidden sm:inline">` so the button reads just "Move" on mobile
  - The dropdown chevron stays visible, allowing stage selection

### Batch card inner product table
- Wrap the expanded product `<table>` in an `overflow-x-auto` container
- Add `min-w-[480px]` to the `<table>` element
- Existing `max-w-[220px] truncate` on product name column is sufficient

**Files:**
- `components/assembly/batch-card.tsx`

---

## Section 4: Settings Page

### Tabs overflow
- Wrap `<TabsList>` in a `<div className="overflow-x-auto">` container
- Add `whitespace-nowrap` to `TabsList` so tab labels don't wrap
- Tab sizing stays unchanged — users can scroll horizontally to reach all tabs

### Tab content panels
- Audit each settings component for fixed `w-[Xpx]` values
- Replace with `max-w-[Xpx] w-full` where found

**Files:**
- `app/(app)/settings/page.tsx`
- `components/settings/access-control-settings.tsx`
- `components/settings/column-group-settings.tsx`
- `components/settings/column-mapping-settings.tsx`
- `components/notifications/stage-subscription-settings.tsx`

---

## Section 5: General Polish

### Notification dropdown
- Currently `w-64`; on 390px with the trigger near the right edge, this can clip
- Change to `w-[min(320px,calc(100vw-2rem))]` to cap width to viewport minus safe margin
- `align="end"` is already set, so it will anchor from the right edge correctly

**Files:** `components/notifications/notification-dropdown.tsx`

### Dialogs
- `MoveToStageDialog`, `DeleteConfirmDialog`, `AddCustomViewDialog` use `sm:max-w-md` or `max-w-md`
- Verify each `DialogContent` has `w-full` so it spans the viewport on 390px without clipping
- No layout changes expected — shadcn Dialog already handles mobile correctly

**Files:**
- `components/assembly/move-to-stage-dialog.tsx`
- `components/products/delete-confirm-dialog.tsx`
- `components/products/views-bar.tsx` (AddCustomViewDialog)

### Sources & Shareables pages
- Quick audit pass: check for fixed widths or non-wrapping containers
- Apply `w-full` / `max-w-full` / `flex-wrap` as needed

**Files:**
- `app/(app)/sources/page.tsx`
- `app/(app)/shareables/page.tsx`

---

## What We Are Not Doing

- No redesign of workflows for touch (swipe, drag, etc.)
- No bottom navigation bar
- No changes to the sidebar or header structure
- No changes to the card view (already works well on mobile)
- No changes below 390px (iPhone SE not targeted)

---

## Success Criteria

- All pages render without horizontal overflow at 390px viewport width
- Products page defaults to card view on mobile; table accessible via toggle
- Assembly batch cards are readable and actionable on 390px
- Settings tabs are reachable via horizontal scroll on mobile
- No dialogs or dropdowns clip outside the viewport on 390px
