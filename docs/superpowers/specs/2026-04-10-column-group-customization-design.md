# Column Group Customization — Design Spec

**Date:** 2026-04-10  
**Status:** Approved

## Summary

Allow admins to customize the column groupings used throughout the app (product detail tabs, views column picker, export dialog). The 11 hardcoded groups in `lib/constants.ts` become the default; admins can rename groups, move fields between groups, add new groups, remove groups, and reset to defaults. A special "Others" group automatically captures any field not assigned to a named group.

---

## Data & Storage

### MongoDB collection: `columngroupconfig`

Single document:

```ts
{
  groups: Array<{
    id: string;      // stable slug, used as tab/section key
    label: string;   // display name
    fields: string[]; // TourProduct field keys (same strings as COLUMN_GROUPS today)
  }>
}
```

- If the document does not exist, the app treats this as "use defaults" — no migration required.
- Reset = delete the document. The system immediately falls back to the hardcoded `COLUMN_GROUPS`.
- The "Others" group is never stored — it is always computed at runtime.

### API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/column-groups` | Returns custom config or hardcoded defaults. Includes `isDefault: boolean` flag. |
| `PUT` | `/api/column-groups` | Saves a new config. Admin-only (checked via session + `getAccessControl()`). |
| `DELETE` | `/api/column-groups` | Removes the document, restoring defaults. Admin-only. |

---

## `useColumnGroups()` Hook

**Location:** `lib/hooks/use-column-groups.ts`

```ts
function useColumnGroups(): {
  groups: EffectiveColumnGroup[];  // resolved groups + Others if needed
  isDefault: boolean;              // true when no custom config is saved
  isLoading: boolean;
}
```

### "Others" computation

After resolving the active group list (custom or default), the hook checks which of the 69 non-`rowIndex` `TourProduct` fields are not assigned to any group. If any exist, it appends:

```ts
{ id: 'others', label: 'Others', fields: [...unassignedFields] }
```

This synthetic group is computed at read time and never persisted.

### Fallback behavior

- If the API returns no custom config → returns hardcoded `COLUMN_GROUPS`.
- If the API call fails → returns hardcoded `COLUMN_GROUPS`.
- During loading → consumers use hardcoded `COLUMN_GROUPS` as the initial value to avoid blank flashes.

### Consumers

All five client components replace `import { COLUMN_GROUPS } from '@/lib/constants'` with `useColumnGroups()`:

- `components/products/product-detail-tabs.tsx`
- `components/products/views-bar.tsx`
- `components/products/export-button.tsx`
- `components/products/product-table.tsx`
- `app/(app)/products/products-client.tsx`

---

## Settings UI

### Placement

New **"Column Groups"** tab in the Settings page (`app/(app)/settings/page.tsx`), shown only to admins (same guard as the existing Access tab).

### Editor layout

A vertical list of group cards. Each card contains:

- **Group name** — inline-editable (click to edit, Enter/blur to confirm)
- **Field pills** — one pill per field showing the human-readable label from `FIELD_LABELS`
  - Each pill has an **×** button to remove the field from the group (field falls to Others)
  - Each pill has a **▾** dropdown listing all current groups — selecting one moves the field there
- **Remove group** button — always enabled; any fields in the group fall to Others automatically

Below the group list:

- **+ Add Group** button — creates a new empty group with a placeholder name, focused for rename
- **Reset to defaults** button — only shown when `isDefault` is false; calls `DELETE /api/column-groups`

### Save behavior

All edits (rename, move field, add group, remove group) are collected into local state. A **Save** button appears when there are unsaved changes; a **Discard** button cancels back to the last saved state. On Save, a single `PUT /api/column-groups` is issued with the full new config. This avoids a round-trip per micro-action.

### "Others" display in the editor

The Others group is shown at the bottom of the list (non-removable, non-renameable, clearly labelled as auto-managed) when at least one field is unassigned. Fields in Others can still be moved to any named group via the pill dropdown.

---

## Constraints & Edge Cases

- **All fields must remain reachable.** The Others group ensures no field is ever truly lost — it always appears somewhere.
- **Duplicate field prevention.** The UI prevents adding a field to a group it already belongs to.
- **Empty groups are valid** — an admin may want a placeholder group with no fields yet. They appear in the tab list but show no content.
- **id stability.** When the admin adds a new group, the `id` is generated as a slug of the label at creation time and never changed thereafter (even if the label is renamed). This prevents broken references in `defaultValue` tab selectors.
- **Admin-only writes.** `PUT` and `DELETE` check the session server-side; `GET` is open to any authenticated user so all consumers can fetch it.
