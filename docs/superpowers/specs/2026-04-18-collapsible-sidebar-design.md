# Collapsible Sidebar

**Date:** 2026-04-18  
**Status:** Approved

## Overview

Make the desktop sidebar collapsible. Collapsed state shows a narrow icon-only strip (~48px). Expanded state is the current 240px layout. State is local to the sidebar component (no persistence, resets to expanded on page load).

## Behaviour

- Sidebar starts expanded on every page load.
- A chevron toggle tab on the right edge of the sidebar switches between expanded and collapsed.
- Collapsed = `w-12` icon-only strip. Expanded = `w-60` full sidebar.
- Width animates with `transition-[width] duration-200 ease-in-out`.
- Mobile sheet drawer (`MobileSidebar`) is unaffected — always full width with labels.

## Components Changed

### `components/layout/sidebar.tsx`

**`Sidebar`**
- Add `const [collapsed, setCollapsed] = useState(false)`.
- Change `<aside>` to `relative overflow-visible` and animate width: `w-12` vs `w-60`.
- Render a toggle `<button>` absolutely positioned on the right edge, vertically centered:
  - Classes: `absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-sm`
  - Icon: `ChevronLeft` when expanded, `ChevronRight` when collapsed (lucide-react, `h-3 w-3`).
- Pass `collapsed` down to `SidebarLogo` and `SidebarNav`.

**`SidebarLogo`**
- Accept `collapsed: boolean` prop.
- Hide the text block (app name + subtitle) when `collapsed` is true — keep only the `SA` badge.
- When collapsed, center the badge using `justify-center`.

**`SidebarNav`**
- Accept `collapsed: boolean` prop.
- When collapsed:
  - Conditionally render the label `<span>` — omit it entirely when `collapsed`.
  - Tighten padding to center the icon: remove `gap-2`, set `px-0 justify-center`.
  - Wrap each `<Link>` in a shadcn `Tooltip` (`TooltipProvider` + `Tooltip` + `TooltipTrigger` + `TooltipContent`) showing the nav item label. Tooltip side: `right`.
- When expanded: existing behaviour unchanged.

## Files to Change

- `components/layout/sidebar.tsx` — only file touched.

## Out of Scope

- State persistence (localStorage).
- Header reacting to collapsed state.
- Mobile sidebar changes.
- Tooltip on expanded nav items.
