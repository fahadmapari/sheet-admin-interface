# Mobile Responsiveness — Targeted Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the products table and product detail sheet functional on mobile screens (≤767px) with no desktop regressions.

**Architecture:** Two surgical CSS class changes. The assembly board already works on mobile — `useAssemblyView` in `lib/hooks/use-assembly-view.ts` forces `list` view when `window.innerWidth < 768`, and the view toggle is hidden with `md:inline-flex`. No new components needed.

**Tech Stack:** Next.js 16, Tailwind CSS, shadcn/ui

---

## Pre-flight: Verify assembly board already works on mobile

- [ ] **Step 1: Confirm no assembly board code change is needed**

  Open `lib/hooks/use-assembly-view.ts`. Confirm `BOARD_MIN_WIDTH = 768` and the effective view logic:
  ```ts
  const effective: AssemblyView =
    storedView === 'board' && boardAvailable ? 'board' : 'list';
  ```
  Confirm `AssemblyViewToggle` in `components/assembly/assembly-view-toggle.tsx` has `hidden ... md:inline-flex`.

  If both are present, no assembly board changes are needed. Move to Task 1.

---

## Task 1: Products Table — Row Actions Always Visible on Mobile

**Files:**
- Modify: `components/products/product-table.tsx:122` (checkbox opacity)
- Modify: `components/products/product-table.tsx:224` (row actions button opacity)

The row actions wrapper and checkbox use `opacity-0 group-hover/row:opacity-100`, which is invisible on touch screens. The fix makes them fully visible below the `md` breakpoint and preserves the hover-reveal on desktop.

- [ ] **Step 1: Fix checkbox opacity class at line 122**

  Find this line in `components/products/product-table.tsx`:
  ```tsx
  className="opacity-0 transition-opacity group-hover/row:opacity-100 data-[state=checked]:opacity-100"
  ```
  Change to:
  ```tsx
  className="opacity-100 md:opacity-0 transition-opacity md:group-hover/row:opacity-100 data-[state=checked]:opacity-100"
  ```

- [ ] **Step 2: Fix row actions button opacity class at line 224**

  Find this line in `components/products/product-table.tsx`:
  ```tsx
  className="opacity-0 transition-opacity group-hover/row:opacity-100"
  ```
  Change to:
  ```tsx
  className="opacity-100 md:opacity-0 transition-opacity md:group-hover/row:opacity-100"
  ```

- [ ] **Step 3: Start dev server and verify on mobile viewport**

  Run: `npm run dev`

  In Chrome DevTools, open the Products page with device toolbar set to 390px wide (iPhone 14). Confirm:
  - Row checkboxes are visible without hovering
  - The three-dot row action button is visible without hovering
  - On a non-mobile viewport (≥768px), row actions are still hidden until hover

- [ ] **Step 4: Commit**

  ```bash
  git add components/products/product-table.tsx
  git commit -m "fix: show product table row actions on mobile (no hover required)"
  ```

---

## Task 2: Product Detail Sheet — Full-Width on Small Phones

**Files:**
- Modify: `components/written-products/written-product-detail-sheet.tsx:83`

The `SheetContent` uses `w-[600px]` which overflows on phones narrower than 600px. Switching to `w-full` as the base and `sm:w-[600px]` for larger screens fixes this.

- [ ] **Step 1: Fix SheetContent width class at line 83**

  Find this line in `components/written-products/written-product-detail-sheet.tsx`:
  ```tsx
  <SheetContent className="w-[600px] sm:max-w-[600px] p-0 flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
  ```
  Change to:
  ```tsx
  <SheetContent className="w-full sm:w-[600px] sm:max-w-[600px] p-0 flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
  ```

- [ ] **Step 2: Verify on mobile viewport**

  With dev server running, navigate to the Written Products page (or wherever this sheet opens). In Chrome DevTools at 390px width, open a product detail sheet. Confirm:
  - Sheet fills the full screen width on mobile
  - Sheet is capped at 600px on desktop (≥640px viewport)
  - Sheet content is scrollable vertically if needed

- [ ] **Step 3: Commit**

  ```bash
  git add components/written-products/written-product-detail-sheet.tsx
  git commit -m "fix: written product detail sheet fills full width on mobile"
  ```

---

## Done

All three mobile issues are resolved:
- Assembly board: already forces list view on mobile via `useAssemblyView` (no change needed)
- Products table: row actions visible on touch (Task 1)
- Product detail sheet: no horizontal overflow on small phones (Task 2)
