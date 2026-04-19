# Mobile Responsiveness — Targeted Fixes

**Date:** 2026-04-19  
**Scope:** Nice-to-have; functional mobile without breaking desktop  
**Approach:** Option A — surgical fixes to three problem areas only

---

## Context

The app is primarily a desktop admin tool. Mobile is nice-to-have. An audit found most of the app (nav, dashboard, settings, dialogs) is already responsive. Two pages have real problems:

- **Assembly board** — Kanban columns are fixed-width (`w-[320px]`) and cannot reasonably be used on a phone
- **Products page** — the card fallback view already exists and works; the only gap is row actions being hover-only

One dialog has a sizing bug too.

---

## Area 1: Assembly Board — Mobile Grouped Accordion

### Problem
The Kanban board uses fixed `w-[320px] shrink-0` columns. On mobile this forces horizontal scrolling through 6+ columns — unusable.

### Solution
Mirror the pattern already used in `app/(app)/products/products-client.tsx`:

1. Add `isMobile` state to `components/assembly/board-view.tsx`, driven by a `useEffect` with `window.matchMedia('(max-width: 767px)')` (with a resize listener for orientation changes).
2. When `isMobile` is true, render a new `AssemblyMobileView` component instead of the Kanban columns.
3. `AssemblyMobileView` accepts the same `batches` and `stages` props the board already has.
4. It renders each stage as a shadcn `Accordion.Item`. Stages with ≥1 batch are expanded by default; empty stages are collapsed.
5. Inside each accordion section, reuse the existing `BatchCard` component unchanged.

**Files changed:**
- `components/assembly/board-view.tsx` — add `isMobile` detection, conditional render
- `components/assembly/assembly-mobile-view.tsx` — new file, the accordion layout

**Files unchanged:** `BatchCard`, `board-column.tsx`, all API routes, all state management

---

## Area 2: Products Table — Row Actions Visible on Touch

### Problem
Row action buttons use `opacity-0 group-hover/row:opacity-100` — invisible on touch screens where hover never fires.

### Solution
Change the opacity classes so actions are always visible below `md` breakpoint:

```
// Before
opacity-0 transition-opacity group-hover/row:opacity-100

// After  
opacity-100 md:opacity-0 transition-opacity group-hover/row:md:opacity-100
```

This keeps the existing desktop hover-reveal behavior and makes actions always visible on mobile.

**File changed:** `components/products/product-table.tsx` — one class change on the row actions wrapper

---

## Area 3: Product Detail Sheet — Width on Small Phones

### Problem
`SheetContent` uses `w-[600px] sm:max-w-[600px]`. On screens narrower than 600px (most phones in portrait), this overflows the viewport.

### Solution
```
// Before
w-[600px] sm:max-w-[600px]

// After
w-full sm:w-[600px] sm:max-w-[600px]
```

**File changed:** `components/products/written-product-detail-sheet.tsx` — one class change

---

## Out of Scope

- Assembly board sub-table (`batch-products-table.tsx`) inside batch cards — acceptable rough edge
- Drag-and-drop on touch (dnd-kit handles it, not addressed)
- `mobile-top-bar.tsx` stub (returns null) — not needed for this scope
- Written products page — same card fallback as products page, acceptable as-is
- Any new mobile-specific navigation or gestures

---

## Success Criteria

- On a 390px-wide screen (iPhone 14):
  - Assembly board shows an accordion grouped by stage, not horizontal Kanban
  - Products table row actions are tappable without hover
  - Product detail sheet opens full-width without horizontal overflow
- No visual regressions on desktop (≥768px)
