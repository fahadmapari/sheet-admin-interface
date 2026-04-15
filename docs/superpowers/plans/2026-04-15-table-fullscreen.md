# Table Fullscreen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fullscreen toggle that expands the ProductTable to cover the entire viewport (sidebar + header hidden) via CSS fixed positioning, with exit via button or Escape key.

**Architecture:** All changes are isolated to `app/(app)/products/products-client.tsx`. `isFullscreen` boolean state controls a `position: fixed; inset: 0; z-index: 50` wrapper around the table div. A `Minimize2` button and an Escape key listener both exit fullscreen. Scroll lock on `document.body` prevents background bleed.

**Tech Stack:** React (useState, useEffect, useCallback), Tailwind CSS, lucide-react

---

### Task 1: Add isFullscreen state and imports

**Files:**
- Modify: `app/(app)/products/products-client.tsx`

- [ ] **Step 1: Add Maximize2 and Minimize2 to the lucide-react import**

In [app/(app)/products/products-client.tsx](app/(app)/products/products-client.tsx), find line 7:

```tsx
import { Plus, Search, X, LayoutGrid, Table2 } from 'lucide-react';
```

Replace with:

```tsx
import { Plus, Search, X, LayoutGrid, Table2, Maximize2, Minimize2 } from 'lucide-react';
```

- [ ] **Step 2: Add isFullscreen state**

After line 50 (`const [activeView, setActiveView] = useState<ViewMode>('table');`), add:

```tsx
const [isFullscreen, setIsFullscreen] = useState(false);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no new TypeScript errors (build may fail for other pre-existing reasons — only care about errors in `products-client.tsx`).

- [ ] **Step 4: Commit**

```bash
git add app/(app)/products/products-client.tsx
git commit -m "feat: add isFullscreen state and imports for table fullscreen"
```

---

### Task 2: Add Escape key listener and scroll lock effects

**Files:**
- Modify: `app/(app)/products/products-client.tsx`

- [ ] **Step 1: Add Escape key useEffect**

After the existing `useEffect` that sets up the mobile media query listener (ends around line 59), add:

```tsx
useEffect(() => {
  if (!isFullscreen) return;
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setIsFullscreen(false);
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [isFullscreen]);
```

- [ ] **Step 2: Add scroll lock useEffect**

Directly after the Escape key effect, add:

```tsx
useEffect(() => {
  document.body.style.overflow = isFullscreen ? 'hidden' : '';
  return () => { document.body.style.overflow = ''; };
}, [isFullscreen]);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no new errors in `products-client.tsx`.

- [ ] **Step 4: Commit**

```bash
git add app/(app)/products/products-client.tsx
git commit -m "feat: add escape key listener and scroll lock for table fullscreen"
```

---

### Task 3: Add fullscreen toggle button to the toolbar

**Files:**
- Modify: `app/(app)/products/products-client.tsx`

- [ ] **Step 1: Add the Maximize2 toggle button**

Find the view-mode toggle group (around lines 303–323). It ends with the closing `</div>` of the toggle group. The surrounding `div` that holds the toggle group and `ExportButton` looks like:

```tsx
<div className="flex flex-wrap items-center gap-2">
  <div className="flex items-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-0.5">
    <Button ...Table button... />
    <Button ...Cards button... />
  </div>
  <ExportButton ... />
  <Button size="sm" onClick={() => setAddOpen(true)}>...</Button>
</div>
```

Add a fullscreen button **after** the toggle group `</div>` and **before** `<ExportButton`:

```tsx
{activeView === 'table' && (
  <Button
    variant="ghost"
    size="sm"
    className="h-7 w-7 p-0"
    onClick={() => setIsFullscreen(true)}
    aria-label="Enter fullscreen"
    title="Fullscreen"
  >
    <Maximize2 className="h-3.5 w-3.5" />
  </Button>
)}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add app/(app)/products/products-client.tsx
git commit -m "feat: add fullscreen toggle button to table toolbar"
```

---

### Task 4: Apply fullscreen styles and add exit button to the table wrapper

**Files:**
- Modify: `app/(app)/products/products-client.tsx`

- [ ] **Step 1: Update the table wrapper div**

Find the table wrapper div (around line 374):

```tsx
<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
  <ProductTable
    ...
  />
</div>
```

Replace it with:

```tsx
<div
  className={cn(
    'flex min-h-0 flex-col overflow-hidden',
    isFullscreen
      ? 'fixed inset-0 z-50 bg-[hsl(var(--background))] flex-1'
      : 'flex-1',
  )}
>
  {isFullscreen && (
    <div className="flex items-center justify-end px-3 py-2 border-b border-[hsl(var(--border))] shrink-0">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={() => setIsFullscreen(false)}
        aria-label="Exit fullscreen"
        title="Exit fullscreen (Esc)"
      >
        <Minimize2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )}
  <ProductTable
    data={searchedProducts}
    isLoading={isLoading}
    error={error}
    rowSelection={rowSelection}
    onRowSelectionChange={setRowSelection}
    onDeleteRequest={(product) => setDeleteTarget(product)}
    onEditRequest={(product) => setSelectedProduct(product)}
    onMoveToNextStage={handleMoveToNextStage}
    onRowClick={(product) => setSelectedProduct(product)}
    columnVisibility={columnVisibility}
  />
</div>
```

- [ ] **Step 2: Verify cn is already imported**

Check line 1-40 of `products-client.tsx` — `cn` should already be imported from `@/lib/utils`. If not, add:

```tsx
import { cn } from '@/lib/utils';
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: clean compile (no new errors in `products-client.tsx`).

- [ ] **Step 4: Start dev server and manually verify**

```bash
npm run dev
```

Open http://localhost:3000/products in a browser and verify:

1. A `Maximize2` icon button appears in the toolbar (only when Table view is active)
2. Clicking it causes the table to expand to cover the full viewport (sidebar + header disappear behind it)
3. A `Minimize2` button appears in the top-right of the fullscreen table
4. Clicking `Minimize2` exits fullscreen and restores the layout
5. Pressing `Escape` while in fullscreen also exits
6. Switching to Cards view hides the Maximize2 button
7. Background page does not scroll while in fullscreen

- [ ] **Step 5: Commit**

```bash
git add app/(app)/products/products-client.tsx
git commit -m "feat: implement table fullscreen overlay with exit controls"
```
