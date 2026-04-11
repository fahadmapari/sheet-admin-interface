# Responsive Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all pages functional at 390px (iPhone 14) via a systematic responsive pass — no layout redesign, just fixing overflow, default views, and cramped elements.

**Architecture:** Purely Tailwind CSS class changes across existing components. No new components or API changes. Each task is an isolated file edit verifiable in the browser at 390px using Chrome DevTools device emulation.

**Tech Stack:** Next.js 14, Tailwind CSS, shadcn/ui, React

---

## File Map

| File | Change |
|---|---|
| `app/(app)/layout.tsx` | Reduce main content padding on mobile |
| `app/(app)/products/products-client.tsx` | Default to cards view on mobile |
| `components/products/product-table.tsx` | Wrap table in overflow-x-auto |
| `components/products/bulk-actions-toolbar.tsx` | Make select widths fluid on mobile |
| `components/products/product-detail-sheet.tsx` | Stack footer on mobile |
| `components/assembly/batch-card.tsx` | Hide date, shorten move button, wrap inner table |
| `app/(app)/settings/page.tsx` | Wrap TabsList in overflow-x-auto |

---

## Task 1: Reduce main content padding on mobile

**Files:**
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Open the file and locate the padding classes**

In `app/(app)/layout.tsx`, line 13, the `div` wrapping `{children}` currently has:
```
px-6 py-6
```

- [ ] **Step 2: Apply responsive padding**

Change that `div`'s classes from:
```tsx
className="mx-auto flex h-full min-h-0 w-full max-w-screen-xl flex-1 flex-col overflow-y-auto px-6 py-6"
```
to:
```tsx
className="mx-auto flex h-full min-h-0 w-full max-w-screen-xl flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-6 sm:py-6"
```

- [ ] **Step 3: Verify in browser**

Run `npm run dev`. Open Chrome DevTools, set device to iPhone 14 (390×844). Navigate to `/`. Confirm the content no longer has 24px side gutters — it should have 12px on each side.

- [ ] **Step 4: Commit**

```bash
git add app/(app)/layout.tsx
git commit -m "fix: reduce main content padding on mobile"
```

---

## Task 2: Default to cards view on mobile (Products page)

**Files:**
- Modify: `app/(app)/products/products-client.tsx`

- [ ] **Step 1: Locate the activeView state initializer**

In `app/(app)/products/products-client.tsx`, around line 38:
```tsx
const [activeView, setActiveView] = useState<ViewMode>('table');
```

- [ ] **Step 2: Add a mount effect to switch to cards on narrow screens**

Leave the `useState` initializer as `'table'` (avoids SSR mismatch). Add a `useEffect` immediately after it:

```tsx
const [activeView, setActiveView] = useState<ViewMode>('table');

useEffect(() => {
  if (window.innerWidth < 768) setActiveView('cards');
}, []);
```

`useEffect` already imported at the top of the file — no new import needed.

- [ ] **Step 3: Verify in browser**

With DevTools at iPhone 14 (390px), hard-reload `/products`. The grid/card view should be active by default. Toggle to table view using the toggle button — it should still work. On desktop (>768px), reload — table view should be default.

- [ ] **Step 4: Commit**

```bash
git add app/(app)/products/products-client.tsx
git commit -m "fix: default to cards view on mobile for products page"
```

---

## Task 3: Make the products table horizontally scrollable

**Files:**
- Modify: `components/products/product-table.tsx`

- [ ] **Step 1: Locate the ProductTable return**

In `components/products/product-table.tsx`, around line 359, the outermost `div` in the return is:
```tsx
<div
  ref={containerRef}
  className="flex items-start min-h-0 flex-1 overflow-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]"
>
  <table className="w-full border-collapse text-sm table-auto">
```

- [ ] **Step 2: Add min-width to the table element**

Change `<table className="w-full border-collapse text-sm table-auto">` to:
```tsx
<table className="w-full min-w-[640px] border-collapse text-sm table-auto">
```

The outer container already has `overflow-auto`, so the table will scroll horizontally when the viewport is narrower than 640px.

- [ ] **Step 3: Verify in browser**

At iPhone 14 (390px), switch to table view on `/products`. The table should scroll horizontally without overflowing the page layout. Columns should remain their normal widths — nothing should collapse.

- [ ] **Step 4: Commit**

```bash
git add components/products/product-table.tsx
git commit -m "fix: set min-width on product table for horizontal scroll on mobile"
```

---

## Task 4: Make bulk actions toolbar selects fluid on mobile

**Files:**
- Modify: `components/products/bulk-actions-toolbar.tsx`

- [ ] **Step 1: Locate the two SelectTrigger elements with fixed widths**

In `components/products/bulk-actions-toolbar.tsx`:
- Line ~107: `<SelectTrigger className="w-44">` (Set Status select)
- Line ~136: `<SelectTrigger className="w-48">` (Move to Stage select)

- [ ] **Step 2: Make widths responsive**

Change:
```tsx
<SelectTrigger className="w-44">
```
to:
```tsx
<SelectTrigger className="w-full sm:w-44">
```

Change:
```tsx
<SelectTrigger className="w-48">
```
to:
```tsx
<SelectTrigger className="w-full sm:w-48">
```

The outer container already has `flex flex-wrap`, so on mobile each select will expand to fill its row.

- [ ] **Step 3: Verify in browser**

At iPhone 14 (390px), select 2+ rows in the products table (switch to table view, check checkboxes). The bulk toolbar should appear. The two dropdowns should be full-width on their own lines rather than overflowing.

- [ ] **Step 4: Commit**

```bash
git add components/products/bulk-actions-toolbar.tsx
git commit -m "fix: make bulk actions toolbar selects full-width on mobile"
```

---

## Task 5: Stack product detail sheet footer on mobile

**Files:**
- Modify: `components/products/product-detail-sheet.tsx`

- [ ] **Step 1: Locate the footer div**

In `components/products/product-detail-sheet.tsx`, around line 413:
```tsx
<div className="flex items-center justify-between gap-3 border-t border-[hsl(var(--border))] px-6 py-4">
```

- [ ] **Step 2: Make the footer stack on mobile**

Change:
```tsx
<div className="flex items-center justify-between gap-3 border-t border-[hsl(var(--border))] px-6 py-4">
```
to:
```tsx
<div className="flex flex-col gap-2 border-t border-[hsl(var(--border))] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-4">
```

The left info block (row number + assembly stage) renders first, action buttons below it on mobile. On `sm` and up, they go back to the original side-by-side layout.

- [ ] **Step 3: Verify in browser**

At iPhone 14 (390px), click any product row to open the detail sheet. Scroll to the bottom. The footer should show row info on top and the "Move to…" / "Close" buttons below it. Stage names like "Ready for Upload" should not overflow. On desktop, the layout should be unchanged.

- [ ] **Step 4: Commit**

```bash
git add components/products/product-detail-sheet.tsx
git commit -m "fix: stack product detail sheet footer on mobile"
```

---

## Task 6: Responsive assembly batch card header and inner table

**Files:**
- Modify: `components/assembly/batch-card.tsx`

This task has three sub-changes to the same file — do them all before committing.

- [ ] **Step 1: Hide the date label on mobile**

In `components/assembly/batch-card.tsx`, around line 181, find:
```tsx
<span className="text-xs text-[hsl(var(--text-tertiary))]">{dateLabel}</span>
```
Change to:
```tsx
<span className="hidden text-xs text-[hsl(var(--text-tertiary))] sm:inline">{dateLabel}</span>
```

- [ ] **Step 2: Shorten the "Move to [Stage]" button text on mobile**

Around line 195, find the button text inside the main move button:
```tsx
<ArrowRight className="mr-1.5 h-3.5 w-3.5" />
{isMoving ? 'Moving...' : `Move to ${nextStage}`}
```
Change to:
```tsx
<ArrowRight className="mr-1.5 h-3.5 w-3.5" />
{isMoving ? 'Moving...' : (
  <>
    <span className="sm:hidden">Move</span>
    <span className="hidden sm:inline">Move to {nextStage}</span>
  </>
)}
```

- [ ] **Step 3: Wrap the inner product table in overflow-x-auto**

Around line 228, inside the `expanded` block, find:
```tsx
<div className="border-t border-[hsl(var(--border))] px-4 py-2">
  {batchProducts.length === 0 ? (
    ...
  ) : (
    <table className="w-full text-sm">
```
Change the outer div and table to:
```tsx
<div className="border-t border-[hsl(var(--border))] px-4 py-2">
  {batchProducts.length === 0 ? (
    ...
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
```
And close the new `<div className="overflow-x-auto">` after the closing `</table>` tag.

- [ ] **Step 4: Verify in browser**

At iPhone 14 (390px), go to `/assembly`. Expand any batch. The batch card header row should fit — date hidden, "Move" button showing short label. The expanded product list should scroll horizontally without overflowing the page.

- [ ] **Step 5: Commit**

```bash
git add components/assembly/batch-card.tsx
git commit -m "fix: responsive assembly batch card header and inner table"
```

---

## Task 7: Make settings tabs horizontally scrollable

**Files:**
- Modify: `app/(app)/settings/page.tsx`

- [ ] **Step 1: Wrap TabsList in a scrollable container**

In `app/(app)/settings/page.tsx`, around line 20, find:
```tsx
<Tabs defaultValue="notifications">
  <TabsList>
```
Change to:
```tsx
<Tabs defaultValue="notifications">
  <div className="overflow-x-auto">
    <TabsList className="whitespace-nowrap">
```
And close the wrapper `</div>` after `</TabsList>`:
```tsx
    </TabsList>
  </div>
```

The full block becomes:
```tsx
<Tabs defaultValue="notifications">
  <div className="overflow-x-auto">
    <TabsList className="whitespace-nowrap">
      <TabsTrigger value="notifications">Notifications</TabsTrigger>
      {showAccessTab && <TabsTrigger value="access">Access</TabsTrigger>}
      {showAccessTab && <TabsTrigger value="column-groups">Column Groups</TabsTrigger>}
      {showAccessTab && <TabsTrigger value="column-mapping">Column Mapping</TabsTrigger>}
    </TabsList>
  </div>
```

- [ ] **Step 2: Verify in browser**

At iPhone 14 (390px), navigate to `/settings` while logged in as an admin (so all 4 tabs render). All four tabs should be reachable by scrolling horizontally. No tab labels should wrap to two lines.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/settings/page.tsx
git commit -m "fix: make settings tabs horizontally scrollable on mobile"
```

---

## Task 8: Visual QA pass at 390px

This task is a verification-only pass — no code changes expected unless something was missed.

- [ ] **Step 1: Open Chrome DevTools at iPhone 14 (390×844)**

Run `npm run dev`. Set DevTools to iPhone 14. Work through every route:

| Route | What to check |
|---|---|
| `/` (Dashboard) | KPI grid wraps to 1-2 cols, charts stack, no overflow |
| `/products` | Cards view by default, search bar full-width, filter chips wrap |
| `/products` (table view) | Table scrolls horizontally, bulk toolbar wraps |
| `/products` (detail sheet) | Open any product; tabs scroll; footer stacks; no overflow |
| `/assembly` | Stage sections collapse; batch headers fit; inner tables scroll |
| `/settings` | All tabs reachable by horizontal scroll; form inputs full-width |
| `/sources` | "Coming soon" centred — no overflow |
| `/shareables` | "Coming soon" centred — no overflow |

- [ ] **Step 2: Fix any newly found issues**

If any component overflows or clips: apply the same patterns used in Tasks 1–7 (`overflow-x-auto`, `flex-wrap`, `w-full sm:w-auto`, `flex-col sm:flex-row`). Commit each fix separately.

- [ ] **Step 3: Final commit (if fixes applied)**

```bash
git add <changed files>
git commit -m "fix: responsive polish from visual QA pass"
```
