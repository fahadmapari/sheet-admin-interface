# Table Fullscreen Design

**Date:** 2026-04-15  
**Status:** Approved

## Summary

Add a fullscreen toggle to the Products table view. When activated, the `ProductTable` wrapper expands to `position: fixed; inset: 0; z-index: 50`, covering the sidebar, header, and all other page UI — leaving only the raw table visible.

## Scope

Only the `table` view mode is affected. The Cards view has no fullscreen option.

## Trigger

A `Maximize2` icon button is added to the right side of the view-mode toolbar in `products-client.tsx`, next to the existing Table / Cards toggle. The button is only rendered when `activeView === 'table'`.

## Fullscreen State

`isFullscreen: boolean` (default `false`) is added to `ProductsClient` local state.

When `isFullscreen` is `true`, the `ProductTable` wrapper div receives additional Tailwind classes:

```
fixed inset-0 z-50 bg-[hsl(var(--background))]
```

This covers the sidebar, header, and all other content. The `ProductTable` itself needs no changes — it already fills its container via `flex-1` and the virtualizer measures its own scroll container.

## Exit Controls

Two ways to exit fullscreen:

1. **Button** — A `Minimize2` icon button absolutely positioned in the top-right corner of the fixed wrapper (`absolute top-3 right-3`). Clicking sets `isFullscreen = false`.
2. **Escape key** — A `keydown` listener added via `useEffect` when `isFullscreen` is `true`, removed on cleanup or when `isFullscreen` becomes `false`.

## Scroll Lock

When `isFullscreen` becomes `true`: `document.body.style.overflow = 'hidden'`  
When `isFullscreen` becomes `false`: `document.body.style.overflow = ''`

Managed via a `useEffect` that watches `isFullscreen`.

## Files Changed

| File | Change |
|------|--------|
| `app/(app)/products/products-client.tsx` | Add `isFullscreen` state; fullscreen button in toolbar; Escape key `useEffect`; scroll lock `useEffect`; conditional classes on table wrapper div |
| `components/products/product-table.tsx` | No changes |

## Icons

From `lucide-react` (already a dependency):
- `Maximize2` — enter fullscreen
- `Minimize2` — exit fullscreen (shown inside the overlay)
