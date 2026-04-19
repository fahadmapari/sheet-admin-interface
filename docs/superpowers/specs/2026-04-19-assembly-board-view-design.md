# Assembly Board View

Date: 2026-04-19

## Overview

Add a Kanban-style board view as an alternative to the existing stacked list view on the Assembly Line tab. The board renders the six assembly stages as horizontal columns with draggable batch cards, letting users see pipeline health and move batches between stages visually. The existing stacked view remains the default and the only view on mobile and on the Archived tab.

This is a view layer addition. No backend changes, no schema changes, no new API routes.

## Goals

- Provide a visual, at-a-glance representation of pipeline state that matches familiar Kanban tools (Trello, ClickUp).
- Preserve information parity with the list view — nothing visible in list view should be hidden in board view.
- Reuse existing move semantics (readiness gate, `/api/assembly/move`) so behavior is identical across views.
- Keep the list view fully intact as the default and as the mobile fallback.

## Non-Goals

- Product-level drag-and-drop (batches only are draggable).
- Custom stage or card colors / theming.
- Multi-select drag.
- Search, filter, or sort within columns — columns render batches in the order the API returns them.
- Mobile board view (<768px stays list-only).
- Board view for the Archived tab.
- Server-side persistence of view or column state.
- Introducing an automated test framework — none exists today and this feature does not justify adding one.

## User Decisions

Recorded during brainstorming:

1. Board coexists with list view via a user-selectable toggle. List is the default.
2. Cards on the board are batches (not individual products).
3. Full drag-and-drop between columns is supported.
4. Overflow is handled with horizontal scroll plus per-column collapse to a narrow rail.
5. Below 768px, the board is unavailable — list view is forced regardless of stored preference.
6. The Archived tab stays list-view only.
7. Column headers are informative: stage name, batch count, staleness dot, owner chips, admin assign-owners popover, collapse chevron.
8. Batch cards are rich: name, count, staleness or date, readiness summary, move button, admin remove.

## Architecture

### View Toggle

A two-button segmented control (`List` / `LayoutGrid` icons from `lucide-react`) rendered in the Assembly Line tab's header area, to the right of the `TabsList`. Hidden below 768px via `md:flex`.

The toggle state is stored in `localStorage` under the key `assembly:view` with value `'list' | 'board'`. Default on first load is `'list'` to preserve current behavior for existing users.

A hook `useAssemblyView()` returns `{ view, setView }`:

- Reads the stored value on mount (SSR-safe: `typeof window !== 'undefined'`, try/catch around `localStorage`).
- Listens to `window.resize`; returns `'list'` when `window.innerWidth < 768` regardless of stored value, so a tablet rotating into portrait flips to list live without overwriting the user's stored preference.
- `setView(value)` writes to localStorage and updates local state.

### Pipeline Summary

The existing `PipelineSummary` component above the tabs is unchanged and remains visible in both view modes. Clicking a pipeline tile:

- In list mode: scrolls to the stage section (current behavior).
- In board mode: scrolls the board container horizontally so that the target column is in view, and uncollapses the column if it was collapsed.

The `onStageClick` callback in `assembly-client.tsx` branches on the current view to pick the right behavior.

### Board Layout

- Board container: `flex` row, horizontal scroll, full height below the pipeline summary.
- Each column is a fixed width of **320px**.
- Columns render in the order defined by `ASSEMBLY_STAGES`.
- Vertical scroll is per-column (column body scrolls; the board itself has horizontal scroll only).
- Gap between columns: 16px.

### Column Header

Sticky at the top of each column. Contains:

- Stage name (left-aligned, `text-sm font-semibold`).
- Batch count badge (`<Badge variant="outline">` showing "`N` batch(es)").
- Staleness dot (red if any batch >7 days in stage, yellow if any >3 days, none otherwise) — reuses `getStageStaleness` logic from `pipeline-summary.tsx`, promoted to a shared helper in `lib/utils.ts` or alongside existing stage helpers.
- Owner avatar chips (up to 3 visible + `+N` overflow) — reuses the rendering from `stage-section.tsx`. Chip tooltip on hover shows the email.
- Admin-only: `UserPlus` button opening the same owner-assignment popover as in `stage-section.tsx`. The popover content (email list, search, save/cancel) is identical.
- Collapse chevron: right-aligned. Clicking toggles `assembly:board:collapsed[stage]`.

### Collapsed Column Rail

When a column is collapsed:

- Width shrinks to ~48px.
- Stage name is rendered vertically (CSS `writing-mode: vertical-rl` or rotated text).
- Batch count badge is stacked below the name.
- Dropping a card onto the collapsed rail during a drag auto-expands the column mid-drag for visual feedback, matching Trello behavior. The expansion is triggered by `dnd-kit`'s `onDragOver` event on the rail's droppable.

Collapsed state is persisted in `localStorage` under `assembly:board:collapsed` as `Record<AssemblyStage, boolean>`. Default all `false`.

### Batch Card (Collapsed)

Rendered by `BoardBatchCard`:

- Row 1: `Package` icon + batch name (truncated, tooltip on hover shows full name).
- Row 2: count badge (`<Badge variant="secondary">` with the product count) + staleness pill OR creation date (matches list-view logic: staleness pill if `daysInStage >= 3`, date otherwise).
- Row 3: readiness summary ("`X/Y` ready") with a small `CheckCircle2` icon + a split `Move →` button identical to the list-view split button (primary action = next stage, dropdown = all stages).
- Admin-only: small `Trash2` icon in the top-right corner triggering the existing remove-batch confirmation dialog.

The card body is the drag handle. Cursor is `grab` on hover, `grabbing` while dragging. Interactive controls (move button, trash, dropdown trigger) use `event.stopPropagation()` and dnd-kit's activation constraints to avoid drag/click ambiguity — `PointerSensor` activation distance of 6px.

### Batch Card (Expanded)

Clicking the card face (outside interactive controls) toggles an inline expansion that renders `BatchProductsTable` below the card header. The table is identical to the one currently rendered inside list-view batch cards:

- Columns: Product, City, Country, Status, Ready, Move, admin Remove.
- Row click opens `ProductDetailSheet` via the same handler.
- Per-product Move button calls `handleProductMoveClick` with the same readiness-gate behavior.

Expansion is per-card, in-memory, not persisted.

### Shared `BatchProductsTable` Component

Extract the product table currently inline in `components/assembly/batch-card.tsx` (the `<table>` rendered inside the expanded batch card) into its own component. This is the targeted refactor justified by the new consumer.

Props:

```ts
interface BatchProductsTableProps {
  batch: AssemblyBatch;
  products: TourProduct[];
  isAdmin: boolean;
  readOnly: boolean;
  movingProductRowIndex: number | null;
  isMoving: boolean;
  nextStage: AssemblyStage | null;
  showReadiness: boolean;
  onProductClick: (product: TourProduct) => void;
  onProductMoveClick: (product: TourProduct, e: React.MouseEvent) => void;
  onRemoveProductClick: (rowIndex: number) => void;
}
```

The `isProductReady(product, batch.stage)` helper and `getDaysInStage(batch)` helper are promoted from inline functions in `batch-card.tsx` to module-level exports in a new `components/assembly/batch-helpers.ts`, so both list and board cards reference the same source. The `getStageStaleness` helper currently in `pipeline-summary.tsx` is also moved into this file so the column header and pipeline summary share one implementation.

### Drag-and-Drop

Library: `@dnd-kit/core` and `@dnd-kit/sortable` (new dependencies).

Chosen because:

- Maintained, native React 19 support.
- Keyboard DnD out of the box (Space/arrow/Esc) with screen-reader announcements via built-in live region.
- Cleaner integration with React 19 than `react-beautiful-dnd` (unmaintained).
- Smaller footprint and better API ergonomics than `react-dnd`.

Structure:

- `BoardView` wraps the board in a single `<DndContext>` with `PointerSensor` (distance activation: 6px) and `KeyboardSensor`.
- Each `BoardColumn` registers a droppable via `useDroppable` keyed by stage name. The column body and collapsed rail are both droppable under the same id.
- Each `BoardBatchCard` registers a draggable via `useDraggable` keyed by `batch._id`, with the batch and its source stage stored in `data`.

#### Drop Semantics

On `onDragEnd`:

1. If `over` is null or the target stage equals the source stage → no-op.
2. Determine move direction by comparing indices in `ASSEMBLY_STAGES`.
3. **Backward move** (target index < source index) → call `moveBatchToStage(batch, targetStage)` immediately. No readiness check (matches current list-view "select any stage from dropdown" behavior).
4. **Forward move** (target index > source index) → compute `readyProducts` and `notReadyCount` for `batch.stage` using `isProductReady`. If `notReadyCount === 0`, call `moveBatchToStage` directly. Otherwise, open the readiness dialog.

#### Shared Readiness Dialog

The readiness dialog currently lives inside `BatchCard`. For the board, the dialog is hoisted to `BoardView` and rendered once — since drags can originate from any card, a single modal serves all pending moves. The dialog's copy, button behavior (`Move ready products` / `Move anyway` / disabled when none-ready), and state shape (`PendingMove`) are unchanged.

The list-view `BatchCard` keeps its own readiness dialog for list-initiated moves. The two dialogs are structurally identical but live in different components to keep ownership clean — the board never drives list-view moves and vice versa.

#### Optimistic UI

While a move is in flight, the dragged card shows a muted/pulsing state in its new column position. On successful response, SWR revalidates `/api/assembly` (and `/api/products` if the target stage is `Ready for Upload`), and the card snaps to its API-determined slot. On error, toast error fires and the card returns to its source column (SWR revalidation undoes the optimistic state).

#### Per-product Moves

Stay as buttons inside the expanded card's product table, same as list view. Products are not draggable.

### Component Tree (Board Mode)

```
AssemblyClient
  PipelineSummary
  Tabs
    TabsList + AssemblyViewToggle (rendered side-by-side)
    TabsContent (current tab)
      BoardView
        <DndContext>
          BoardColumn × 6
            ColumnHeader (name, count, staleness, owners, admin popover, collapse)
            ColumnBody (droppable)
              BoardBatchCard × N
                CardFace (draggable)
                BatchProductsTable (when expanded)
          ReadinessDialog (single instance)
      | StageSection × 6  (when view === 'list')
```

## Data Flow

All data fetching in `AssemblyClient` is unchanged. The same SWR hooks (`/api/assembly`, `/api/assembly/archived`, `/api/products`, `/api/assembly/stage-config`, `/api/access-control`) feed both views. All handler functions (`moveBatchToStage`, `handleBatchMoveToStage`, `handleProductMoveToNextStage`, `handleOwnersChange`, `handleRemoveBatch`, `handleRemoveProduct`, `handlePipelineStageTileClick`) are hoisted or kept at the `AssemblyClient` level and passed down to `BoardView` — same shape they pass to `StageSection` today.

`BoardView` receives the same props `StageSection` does today, minus the stage-specific arguments (it iterates stages internally):

```ts
interface BoardViewProps {
  assemblyData: AssemblyResponse;
  products: TourProduct[];
  movingBatchId: string | null;
  movingProductRowIndex: number | null;
  isAdmin: boolean;
  owners: Record<AssemblyStage, string[]>;
  allEmails: string[];
  onOwnersChange: (stage: AssemblyStage, emails: string[]) => Promise<void>;
  onBatchMoveToNextStage: (batch: AssemblyBatch) => Promise<void>;
  onBatchMoveToStage: (batch: AssemblyBatch, target: AssemblyStage) => Promise<void>;
  onMoveProductToNextStage: (product: TourProduct, batch: AssemblyBatch) => Promise<void>;
  onProductClick: (product: TourProduct) => void;
  onRemoveBatch: (batchId: string) => Promise<void>;
  onRemoveProduct: (rowIndex: number) => Promise<void>;
}
```

## Files

### New

- `components/assembly/board-view.tsx` — board root, `DndContext`, shared readiness dialog, renders 6 `BoardColumn`s.
- `components/assembly/board-column.tsx` — column header + droppable body + collapsed rail.
- `components/assembly/board-batch-card.tsx` — draggable card (collapsed + expanded face).
- `components/assembly/batch-products-table.tsx` — shared product table (extracted from `batch-card.tsx`).
- `components/assembly/batch-helpers.ts` — shared `isProductReady`, `getDaysInStage`, and `getStageStaleness` helpers (extracted from `batch-card.tsx` and `pipeline-summary.tsx`).
- `components/assembly/assembly-view-toggle.tsx` — two-button segmented control.
- `lib/hooks/use-assembly-view.ts` — localStorage-backed view preference with viewport gating.

### Modified

- `app/(app)/assembly/assembly-client.tsx` — imports `useAssemblyView`, renders `AssemblyViewToggle` next to `TabsList`, branches on view to render `BoardView` or the existing `StageSection` stack. Pipeline tile click behavior branches on view.
- `components/assembly/batch-card.tsx` — replaces inline product table with `<BatchProductsTable />`. Keeps its own readiness dialog and remove dialogs for list-view use.
- `components/assembly/pipeline-summary.tsx` — imports `getStageStaleness` from `batch-helpers.ts` instead of defining it locally.
- `package.json` — adds `@dnd-kit/core` and `@dnd-kit/sortable`.

### Unchanged

- All API routes.
- All MongoDB schemas and collections.
- `components/assembly/stage-section.tsx` (continues to serve list view).
- `components/assembly/pipeline-summary.tsx` (aside from possible helper extraction).
- `components/assembly/move-to-stage-dialog.tsx`.
- `lib/types.ts`.

## Persistence

All state is local — no backend persistence.

- `assembly:view` → `'list' | 'board'`. Default `'list'`.
- `assembly:board:collapsed` → `Record<AssemblyStage, boolean>`. Default all `false`.
- Stage-section collapse (list view) → in-memory per session, unchanged.
- Card expansion (board view) → in-memory per session, per card.

All localStorage access is SSR-safe (guarded by `typeof window !== 'undefined'`) and try/catch wrapped so private-browsing quota errors fall back to defaults silently.

## Error Handling

- Move failure: existing toast error path in `moveBatchToStage` fires; SWR revalidation restores state. Board's optimistic card returns to source column.
- Drop outside a column: `onDragEnd` short-circuits when `over` is null — no API call.
- Concurrent move: if a second drag begins while the first is in flight, `movingBatchId` guards the card in flight; dragging a different card is allowed.
- localStorage unavailable: hook falls back to in-memory defaults silently.

## Accessibility

- Keyboard DnD via `KeyboardSensor`: Space to pick up, arrow keys to nudge between columns, Space to drop, Escape to cancel.
- Screen-reader announcements via dnd-kit's built-in live region announcing "Picked up batch X. Draggable item X was moved over droppable area Y. ..." etc.
- View toggle buttons have explicit `aria-label` and `aria-pressed` state.
- Column collapse buttons have explicit `aria-expanded` state.
- Card drag handle has `aria-describedby` pointing to a hidden description of how to drag.
- Color-only signals (staleness dot) are supplemented with tooltip text ("Batch stuck >7 days" / ">3 days") as already done in `PipelineSummary`.

## Testing Plan

Manual (no automated test framework exists in this project — verified by `package.json` — not introducing one for this feature):

1. Toggle between list and board views; verify preference persists across reload.
2. Verify board toggle is hidden and list is forced below 768px; rotate a tablet across the breakpoint and confirm live flip.
3. Drag a batch to every other stage (forward and backward) — verify backward skips the dialog, forward with all-ready skips the dialog, forward with some-not-ready opens the dialog.
4. In the readiness dialog: confirm "Move ready products" moves only ready ones, "Cancel" aborts, "Move anyway" works for per-product, none-ready shows the OK-only state.
5. Keyboard DnD: Tab to a card, Space to pick up, arrow keys to move between columns, Space to drop, Escape to cancel mid-drag.
6. Collapse a column; verify rail width and vertical label; drag a card onto the rail and confirm auto-expansion mid-drag.
7. Expand a batch card; verify the product table renders identically to list view; per-product move buttons work; product row click opens the detail sheet.
8. Admin owner assignment from a column header; verify popover, save, and chip rendering match list view.
9. Non-admin: verify no `UserPlus` button, no remove (trash) controls.
10. Pipeline tile click in board mode scrolls to and uncollapses the target column.
11. Archived tab: confirm the view toggle does not appear there and it stays list-only.
12. Remove batch and remove product from board cards; verify confirmation dialogs fire and actions succeed.
13. Simulate a failed move (kill network on `/api/assembly/move`) and verify the card returns to source column with a toast error.

## Dependencies

New:

- `@dnd-kit/core`
- `@dnd-kit/sortable`

No other dependencies added, removed, or upgraded.

## Rollout

Single PR, no feature flag. Default view is `'list'` so existing users see no change until they opt in via the toggle. Board view is additive — if it is ever removed, deleting the new files and the toggle/branch in `assembly-client.tsx` reverts cleanly to the current state.
