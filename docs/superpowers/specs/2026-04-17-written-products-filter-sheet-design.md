# Written Products Filter Sheet — Design Spec

**Date:** 2026-04-17  
**Status:** Approved

## Goal

Add filters for all WrittenProduct columns and move filter UI into a Sheet sidebar, matching the products page pattern. Search stays inline; all other filters live inside the Sheet.

## WrittenProduct Fields & Filter Types

| Field | Type | Filter Kind |
|---|---|---|
| country | string | Multi-select (derived from data) |
| state | string | Multi-select (derived from data) |
| cityDestination | string | Multi-select (derived from data) |
| tourType | string | Multi-select (derived from data) |
| ccOk | boolean | Tri-state (All / Yes / No) |
| isOk | boolean | Tri-state |
| rrOk | boolean | Tri-state |
| ssOk | boolean | Tri-state |
| contentExist | boolean | Tri-state |
| b2b | boolean | Tri-state |
| b2c | boolean | Tri-state |
| ssNotes | boolean | Tri-state |
| textLink | string | Search only (not in Sheet) |

## Filter Sections (Sheet Accordion)

### Location
- Country (multi-select, searchable)
- State (multi-select, searchable)
- City / Destination (multi-select, searchable)
- Tour Type (multi-select, searchable)

### Status
- CC OK (tri-state)
- IS OK (tri-state)
- RR OK (tri-state)
- SS OK (tri-state)
- Content Exist (tri-state)
- B2B (tri-state)
- B2C (tri-state)
- SS Notes (tri-state)

Both sections open by default.

## UI Layout

```
[ Search input ]  [ Filters (N) ]  chip chip chip  [Clear all]
```

- Search input: unchanged, stays inline
- "Filters" button: outlined, shows active count badge when any filter is active, accent-colored when active
- Active chips: one per multi-select value (`Country: France`), one per non-"all" tri-state (`CC OK: Yes`)
- "Clear all": text link, only shown when filters are active
- Sheet: right side, 390px wide, header with "Filters" title + "Clear all" ghost button

## Files

### New: `lib/written-product-filters.ts`
- `WPTriState = 'all' | 'yes' | 'no'`
- `WrittenProductFilters` interface (4 string arrays + 8 tri-states)
- `DEFAULT_WP_FILTERS`
- `WP_FILTER_SECTIONS = ['Location', 'Status']`
- `WP_MULTI_SELECT_FILTERS` array (country, state, cityDestination, tourType)
- `WP_TRI_STATE_FILTERS` array (ccOk, isOk, rrOk, ssOk, contentExist, b2b, b2c, ssNotes)
- `getWPActiveFilterCount(filters)` — counts active filters for badge
- `getWPActiveFilterCountForSection(filters, section)` — for accordion badge

### Modified: `components/written-products/written-product-filter-bar.tsx`
- Remove `WrittenProductFilters` type and `DEFAULT_WP_FILTERS` (moved to lib)
- Re-export them from lib for backwards compat with client import
- Replace inline dropdown approach with Sheet + Accordion
- Multi-select options derived from `allProducts` prop (no API call needed)
- Reuse `MultiSelectPopover` and `TriStateToggle` patterns from `filter-bar.tsx`
- Show active chips inline for multi-selects and non-"all" tri-states

### Modified: `app/(app)/written-products/written-products-client.tsx`
- Import `WrittenProductFilters`, `DEFAULT_WP_FILTERS` from new lib file
- Expand `filteredProducts` memo to apply all 12 filter fields
- Multi-selects: skip if empty, otherwise check `includes`
- Tri-states: skip if `'all'`, otherwise check `Boolean(field) === (value === 'yes')`

## Constraints

- No API changes — options are derived client-side from `allProducts`
- No new dependencies — reuses existing shadcn/ui primitives (Sheet, Accordion, Popover, Checkbox)
- Search input position and behavior unchanged
