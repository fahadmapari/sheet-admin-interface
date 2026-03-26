# Phase 5 — Dashboard, Inventory Update, Polish, URL Filters, Sidebar

## Status at start of this phase
- ✅ All previous phases complete
- ✅ Full CRUD: GET, POST, PUT, PATCH, DELETE for products
- ✅ Bulk actions (Set PIC, Set Status, Mark Ready, Delete)
- ✅ Export (CSV, XLSX)
- **Tasks 20–24 begin here**

## Context

Working directory: `e:/projects/sheet-admin`
Framework: Next.js 14 App Router, TypeScript strict, Tailwind CSS, shadcn/ui (New York/Zinc)
Installed packages: `recharts`, `swr`, `sonner`, `date-fns`

API routes already built:
- `GET /api/products` — all rows as TourProduct[]
- `GET /api/filters` — distinct filter values
- `GET /api/stats` — aggregated counts
- `GET /api/inventory-update` — raw Inventory Update sheet rows

Run `npm install` if node_modules is missing. TypeScript must stay clean (`npx tsc --noEmit`).

---

## Task 20 — Dashboard with KPI Cards and Charts

### File to modify
`app/page.tsx` — replace the placeholder with the real dashboard

### Overview

The dashboard is a **server component** that fetches stats, and passes data to client chart components.

### `app/page.tsx`

```typescript
// Server component — fetches from internal API or directly from Sheets
import { fetchAllRows } from '@/lib/sheets';
import { rowToProduct } from '@/lib/utils';
import { DashboardClient } from '@/components/dashboard/dashboard-client';

export default async function DashboardPage() {
  const rows = await fetchAllRows();
  const products = rows.slice(1).map((row, i) => rowToProduct(row, i + 2));
  return <DashboardClient products={products} />;
}
```

### `components/dashboard/dashboard-client.tsx`

Client component that receives all products and renders KPI cards + charts.

```typescript
'use client';
import type { TourProduct } from '@/lib/types';
// ... recharts imports
```

### KPI Cards

Create `components/dashboard/kpi-card.tsx`:

```typescript
interface KpiCardProps {
  title: string;
  value: number;
  total?: number; // for percentage display
  color?: 'default' | 'green' | 'amber' | 'red' | 'gray';
  icon?: React.ReactNode;
}
```

Cards to render (use `Card` from shadcn/ui):
| Card | Value | Color |
|---|---|---|
| Total Products | `products.length` | default |
| Ready for Upload | count where `readyForUpload === true` | green |
| Uploaded | count where `uploadedPic` is non-empty and !== 'No' | green |
| In Progress | count where `productStatus === 'In Progress'` | amber |
| High Priority | count where `productStatus === 'In Progress - High priority'` | red |
| Completed | count where `productStatus === 'Completed'` | green |
| On Hold | count where `productStatus === 'On hold'` | gray |

### Charts

Use Recharts. All charts are `'use client'` components.

#### Chart 1 — Products by Country (Horizontal Bar)
File: `components/dashboard/charts.tsx`

- Group products by `country`, count each
- Show top 20 countries
- Use `BarChart` from recharts with `layout="vertical"`
- Country names on the Y axis, count on X axis

#### Chart 2 — Products by Type (Donut)
- Group by `productType`, count each
- Use `PieChart` + `Pie` with `innerRadius` (donut style)
- Show top 10 types, group rest as "Other"
- Legend below

#### Chart 3 — Products by Status (Stacked Bar or Horizontal Bar)
- 5 bars: In Progress, Completed, High Priority, On Hold, Ignored
- Use STATUS_COLORS for fill colours
- Simple `BarChart` with single bars per status

#### Chart 4 — Upload Progress (Progress Bar)
- Fraction: ready for upload / total
- Use a simple HTML/CSS progress bar or a `RadialBarChart`
- Show `{readyCount} / {total} ready for upload`

#### Chart 5 — PIC Workload (Bar Chart)
- Group by `pic`, count products per PIC
- Use `BarChart` — horizontal
- Show all PICs

#### Chart 6 — OTA Coverage (Bar Chart)
- For each OTA channel (Travmonde, Bookable Tours, Viator, GYG, Hotelbeds, Project Expedition, Airbnb, Bokun, Trekksoft, TUI/Musement, Klook, Toristy, TourHQ)
- Count products where the OTA field is non-empty and not "No" and not "0"
- Use `BarChart`

### Layout

```
┌──────────────────────────────────────────┐
│  KPI Cards (grid: 3 per row on desktop) │
├──────────────────────────────────────────┤
│  [Products by Country]  [By Type]        │
├──────────────────────────────────────────┤
│  [By Status]  [Upload Progress]          │
├──────────────────────────────────────────┤
│  [PIC Workload]  [OTA Coverage]          │
└──────────────────────────────────────────┘
```

Use `grid grid-cols-1 md:grid-cols-2 gap-6` for chart grid, `Card` wrapper for each chart.

**Commit message:** `feat: dashboard with KPI cards and 6 Recharts visualisations`

---

## Task 21 — Inventory Update Page (Read-Only)

### File to create
`app/inventory-update/page.tsx`

The "Inventory Update" Google Sheet is a static instructions document for the team. Render it as a styled read-only page, not a data table.

### Implementation (server component)

```typescript
import { fetchInventoryUpdate } from '@/lib/sheets';

export default async function InventoryUpdatePage() {
  const rows = await fetchInventoryUpdate();
  // ... render
}
```

**Rendering logic:**
- The sheet contains text instructions. Rows may be:
  - Empty (skip)
  - Single-cell rows that look like headings (all-caps or bold formatting) → render as `<h2>` or `<h3>`
  - Multi-cell rows → render as a table row or paragraph
- Since we can't know the exact content without connecting to the real sheet, build a flexible renderer:
  - If a row has only 1 non-empty cell and it looks like a heading (length > 0, starts with a capital letter, is short < 80 chars) → render as `<h3 className="font-semibold text-lg mt-6 mb-2">`
  - If a row is empty → skip or render spacer
  - Otherwise → render all non-empty cells as a `<p>` or list of cells separated by ` — `
- Wrap everything in a `prose`-style div: `max-w-3xl mx-auto px-8 py-10`

Add a banner at the top:
```tsx
<div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 mb-6 text-amber-800 text-sm">
  This page is read-only. Edit the "Inventory Update" sheet directly in Google Sheets.
</div>
```

**Commit message:** `feat: Inventory Update read-only page`

---

## Task 22 — Loading States, Error Handling, Toast Notifications

Audit all pages and components for missing loading and error states. This is a polish task.

### Checklist

**Loading states:**
- Products page: while SWR is fetching, show skeleton table (already partially done)
  - Skeleton: 10 rows × 8 columns of `<Skeleton>` components from shadcn/ui
  - Show spinner in the column visibility button during refetch
- Dashboard: while server-fetching, Next.js shows the loading.tsx placeholder
  - Create `app/loading.tsx` — a full-page spinner
  - Create `app/products/loading.tsx` — table skeleton
- Product detail page: show skeleton form while loading

**Error states:**
- Products page: if `/api/products` returns an error, show an `<Alert>` with the error message and a "Retry" button that calls `mutate()`
- Dashboard: if server fetch fails, show a `notFound()` or an error boundary
- Create `app/error.tsx` — a root error boundary (must be `'use client'`)

**Toast notifications (review and ensure consistency):**
- Inline cell edit → `toast.success('Saved')` on success, `toast.error('...')` on fail ✅
- Bulk actions → `toast.success('Updated N rows')` ✅
- Delete → `toast.success('Deleted')` after confirmed delete
- Add new product → `toast.success('Product added')` ✅
- Save product detail → `toast.success('Product saved')` ✅
- Export → `toast.success('Exported N rows')` (add this)

**Ensure `<Toaster>` from sonner is in `app/layout.tsx` ✅**

### Files to create/modify
- `app/loading.tsx`
- `app/error.tsx`
- `app/products/loading.tsx`
- Update `components/products/product-table.tsx` — ensure error state exists
- Update bulk-actions, inline-edit, product-form as needed for consistent toast messages

**Commit message:** `feat: loading states, error boundaries, consistent toast notifications`

---

## Task 23 — URL-Synced Filters

Make the filter state (country, city, productType, status, PIC, readyForUpload, globalSearch) persist in the URL as query parameters, so filter combinations can be shared via URL.

### Implementation

In `app/products/page.tsx` (make it a client component for URL sync, or use a wrapper):

Use `useSearchParams`, `useRouter`, `usePathname` from `next/navigation`.

```typescript
'use client';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

// Read initial filter state from URL
const searchParams = useSearchParams();
const initialFilters = {
  country: searchParams.get('country') ?? '',
  city: searchParams.get('city') ?? '',
  productTypes: searchParams.getAll('type'),
  statuses: searchParams.getAll('status'),
  pics: searchParams.getAll('pic'),
  readyForUpload: (searchParams.get('ready') ?? 'all') as 'all' | 'yes' | 'no',
};
const initialSearch = searchParams.get('q') ?? '';
```

When filters change, update the URL (replace, not push — no browser history spam):
```typescript
const updateUrl = (newFilters: typeof filters, newSearch: string) => {
  const params = new URLSearchParams();
  if (newFilters.country) params.set('country', newFilters.country);
  if (newFilters.city) params.set('city', newFilters.city);
  newFilters.productTypes.forEach(t => params.append('type', t));
  newFilters.statuses.forEach(s => params.append('status', s));
  newFilters.pics.forEach(p => params.append('pic', p));
  if (newFilters.readyForUpload !== 'all') params.set('ready', newFilters.readyForUpload);
  if (newSearch) params.set('q', newSearch);
  router.replace(`${pathname}?${params.toString()}`, { scroll: false });
};
```

Call `updateUrl` inside a `useEffect` that watches `filters` and `globalSearch`.

**Note:** Wrapping `useSearchParams` in a Suspense boundary is required by Next.js 14. Wrap the products page client component in a `<Suspense>` in a server component wrapper.

### Structure
```
app/products/page.tsx  (server component — just renders Suspense wrapper)
  └── components/products/products-page-client.tsx  (client component — has all the state/filters/URL sync)
```

**Commit message:** `feat: URL-synced filter state for products page`

---

## Task 24 — Responsive Sidebar Layout

Polish the sidebar to be collapsible on desktop and a drawer on mobile.

### Desktop (collapsible)

Add a toggle button that collapses the sidebar to an icon-only rail (56px wide) or expands it to full width (224px).

```typescript
const [collapsed, setCollapsed] = useState(false);

<aside className={cn(
  'flex h-screen flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200',
  collapsed ? 'w-14' : 'w-56'
)}>
  {/* Collapse toggle button */}
  <button onClick={() => setCollapsed(!collapsed)}>
    <PanelLeftClose className={cn('transition-transform', collapsed && 'rotate-180')} />
  </button>

  {/* Nav items */}
  {nav.map(item => (
    <Link ...>
      <Icon /> {/* Always visible */}
      {!collapsed && <span>{label}</span>} {/* Hidden when collapsed */}
    </Link>
  ))}
```

When collapsed:
- Show only icons (no text labels)
- Use `Tooltip` from shadcn/ui to show the label on hover

### Mobile (drawer)

On screens smaller than `md` (768px), hide the sidebar entirely. Add a hamburger button in the top bar that opens the sidebar as a `Sheet` (slide-over from shadcn/ui).

```typescript
// Top bar (mobile only)
<div className="md:hidden flex items-center px-4 h-14 border-b">
  <Sheet>
    <SheetTrigger>
      <Menu className="h-5 w-5" />
    </SheetTrigger>
    <SheetContent side="left" className="w-56 p-0 bg-sidebar">
      {/* Same nav items as desktop sidebar */}
    </SheetContent>
  </Sheet>
  <span className="ml-3 font-semibold">Sheet Admin</span>
</div>
```

Update `app/layout.tsx`:
- On mobile: show hamburger header + full-width main
- On desktop: show sidebar + main as flex row

```tsx
<body>
  {/* Mobile top bar */}
  <div className="md:hidden ...">...</div>

  <div className="flex h-screen overflow-hidden">
    {/* Desktop sidebar */}
    <div className="hidden md:flex">
      <Sidebar />
    </div>

    <main className="flex-1 overflow-auto">
      {children}
    </main>
  </div>
  <Toaster />
</body>
```

**Commit message:** `feat: collapsible desktop sidebar and mobile drawer`

---

## Verification

After all tasks in this phase:
1. `npx tsc --noEmit` — must pass with zero errors
2. `npm run build` — must succeed
3. All 5 pages load without crashing: `/`, `/products`, `/products/[rowIndex]`, `/inventory-update`
4. Dashboard shows all 7 KPI cards and 6 charts
5. Sidebar collapses on desktop
6. URL updates when filters change on products page
7. `app/error.tsx` and `app/loading.tsx` exist
