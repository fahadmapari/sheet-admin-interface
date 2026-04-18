# Collapsible Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the desktop sidebar collapsible between a 240px full-label view and a 48px icon-only strip, toggled by a chevron tab on the sidebar's right edge.

**Architecture:** All state lives in the `Sidebar` component (`useState(false)`). `SidebarLogo` and `SidebarNav` receive a `collapsed` boolean prop. Width animates via `transition-[width]`. Tooltips (shadcn) show nav labels when collapsed.

**Tech Stack:** React `useState`, lucide-react (`ChevronLeft`, `ChevronRight`), shadcn `Tooltip` (`components/ui/tooltip.tsx`), Tailwind CSS

---

## File Map

| File | Change |
|------|--------|
| `components/layout/sidebar.tsx` | Only file modified — all changes here |

---

### Task 1: Update imports in sidebar.tsx

**Files:**
- Modify: `components/layout/sidebar.tsx:1-8`

- [ ] **Step 1: Replace the import block**

Open `components/layout/sidebar.tsx`. Replace the existing imports (lines 1–8):

```tsx
'use client';

import { type ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  Package,
  Settings,
  BookOpen,
  Share2,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
```

- [ ] **Step 2: Verify the file still compiles**

Run: `npm run build 2>&1 | tail -20`

Expected: No errors related to imports. (Other errors are fine at this stage.)

---

### Task 2: Update SidebarLogo to accept collapsed prop

**Files:**
- Modify: `components/layout/sidebar.tsx` — `SidebarLogo` function

- [ ] **Step 1: Replace SidebarLogo**

Replace the entire `SidebarLogo` function with:

```tsx
function SidebarLogo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex h-16 items-center border-b border-[hsl(var(--border))] px-4">
      <div className={cn('flex min-w-0 items-center gap-2', collapsed && 'w-full justify-center')}>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[11px] font-semibold text-[hsl(var(--text-primary))]">
          SA
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[hsl(var(--text-primary))]">
              Sheet Admin
            </p>
            <p className="truncate text-xs text-[hsl(var(--text-tertiary))]">Tour Products</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `npm run build 2>&1 | tail -20`

Expected: No TypeScript errors on `SidebarLogo`.

---

### Task 3: Update SidebarNav to accept collapsed prop and render tooltips

**Files:**
- Modify: `components/layout/sidebar.tsx` — `SidebarNav` function

- [ ] **Step 1: Replace SidebarNav**

Replace the entire `SidebarNav` function with:

```tsx
export function SidebarNav({
  onNavigate,
  collapsed,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === '/'
                ? pathname === href
                : pathname === href || pathname.startsWith(`${href}/`);

            const linkClassName = cn(
              'flex h-8 items-center rounded-md text-sm text-[hsl(var(--text-secondary))] transition-colors',
              'hover:bg-[hsl(var(--surface))] hover:text-[hsl(var(--text-primary))]',
              isActive && 'bg-[hsl(var(--surface-raised))] font-medium text-[hsl(var(--text-primary))]',
              collapsed ? 'justify-center px-0' : 'gap-2 px-3',
            );

            if (collapsed) {
              return (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>
                    <Link href={href} onClick={onNavigate} className={linkClassName}>
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link key={href} href={href} onClick={onNavigate} className={linkClassName}>
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `npm run build 2>&1 | tail -20`

Expected: No TypeScript errors on `SidebarNav`.

---

### Task 4: Update Sidebar to add collapsed state and chevron toggle tab

**Files:**
- Modify: `components/layout/sidebar.tsx` — `Sidebar` function

- [ ] **Step 1: Replace Sidebar**

Replace the entire `Sidebar` function with:

```tsx
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 border-r border-[hsl(var(--border))] bg-[hsl(var(--background))]',
        'relative overflow-visible transition-[width] duration-200 ease-in-out md:flex md:flex-col',
        collapsed ? 'w-12' : 'w-60',
      )}
    >
      <SidebarLogo collapsed={collapsed} />
      <SidebarNav collapsed={collapsed} />
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute right-0 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-sm hover:bg-[hsl(var(--surface))]"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
        ) : (
          <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
        )}
      </button>
    </aside>
  );
}
```

- [ ] **Step 2: Verify full build passes**

Run: `npm run build 2>&1 | tail -30`

Expected: Build succeeds with no TypeScript or compilation errors.

---

### Task 5: Visual verification

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

Open `http://localhost:3000` in a browser.

- [ ] **Step 2: Verify expanded state**

Check:
- Sidebar shows at full width (~240px) with app name, icons, and labels
- Small circular chevron tab visible on the right edge of the sidebar (half-overlapping the content area)
- Chevron points left (`ChevronLeft`)

- [ ] **Step 3: Verify collapsed state**

Click the chevron tab. Check:
- Sidebar animates to icon-only strip (~48px)
- Only `SA` badge visible in the logo area, centered
- Nav items show icons only, centered
- Chevron now points right (`ChevronRight`)
- Main content area expands to fill the freed space

- [ ] **Step 4: Verify tooltips**

While collapsed, hover over a nav icon. Check:
- Tooltip appears to the right of the icon showing the nav item label (e.g. "Dashboard", "Products")
- Tooltip dismisses on mouse-out

- [ ] **Step 5: Verify mobile unaffected**

Resize the browser to mobile width. Check:
- Sidebar is hidden (no visible change)
- The hamburger menu in the header still opens the mobile sheet drawer with full labels

- [ ] **Step 6: Verify state resets on reload**

Collapse the sidebar, then refresh the page. Check:
- Sidebar opens in expanded state (no persistence)

---

### Task 6: Commit

- [ ] **Step 1: Stage and commit**

```bash
git add components/layout/sidebar.tsx
git commit -m "feat: add collapsible sidebar with icon-only strip and chevron toggle"
```
