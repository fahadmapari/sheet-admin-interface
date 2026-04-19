# Date Picker for Inline Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render `<input type="date">` for date fields in inline edit mode so users get the browser's native date picker instead of a plain text box.

**Architecture:** Move `DATE_FIELDS` from a local constant in `product-detail-tabs.tsx` to `lib/constants.ts` as a shared export. Import it in both `product-detail-tabs.tsx` and `inline-edit-cell.tsx`. Add a date field case in `inline-edit-cell.tsx`'s type-switch, before the default text input fallback.

**Tech Stack:** React, Next.js, shadcn/ui `Input`, native HTML5 `<input type="date">`

---

### Task 1: Export `DATE_FIELDS` from `lib/constants.ts`

**Files:**
- Modify: `lib/constants.ts`

- [ ] **Step 1: Add `DATE_FIELDS` export to `lib/constants.ts`**

Open `lib/constants.ts`. At the end of the file, add:

```ts
export const DATE_FIELDS = new Set<string>(['dateOfDispatch', 'dateUploaded']);
```

- [ ] **Step 2: Verify the build compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/constants.ts
git commit -m "feat: export DATE_FIELDS constant from lib/constants.ts"
```

---

### Task 2: Update `product-detail-tabs.tsx` to use shared constant

**Files:**
- Modify: `components/products/product-detail-tabs.tsx`

- [ ] **Step 1: Replace the local `DATE_FIELDS` definition with an import**

In `components/products/product-detail-tabs.tsx`, find this line (around line 143):

```ts
const DATE_FIELDS = new Set<string>(['dateOfDispatch', 'dateUploaded']);
```

Delete that line, and add `DATE_FIELDS` to the existing import from `@/lib/constants` (or add a new import if none exists):

```ts
import { DATE_FIELDS } from '@/lib/constants';
```

- [ ] **Step 2: Verify the build compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: no errors. The tab view date rendering should work exactly as before.

- [ ] **Step 3: Commit**

```bash
git add components/products/product-detail-tabs.tsx
git commit -m "refactor: import DATE_FIELDS from lib/constants in product-detail-tabs"
```

---

### Task 3: Add date field case to `inline-edit-cell.tsx`

**Files:**
- Modify: `components/products/inline-edit-cell.tsx`

- [ ] **Step 1: Import `DATE_FIELDS` in `inline-edit-cell.tsx`**

At the top of `components/products/inline-edit-cell.tsx`, add `DATE_FIELDS` to the import from `@/lib/constants` (or add a new import):

```ts
import { DATE_FIELDS } from '@/lib/constants';
```

- [ ] **Step 2: Add the date field case before the default text input**

In `inline-edit-cell.tsx`, find the default text input block (around line 946):

```tsx
  // Default — text Input
  if (!editing) {
    return (
      <button
        className={cn("w-full rounded p-0.5 text-left transition-colors", readOnly ? "cursor-default" : "cursor-pointer hover:bg-[hsl(var(--surface))]")}
        onClick={() => { if (!readOnly) setEditing(true); }}
      >
        {getDisplayValue(field, rawValue)}
      </button>
    );
  }

  return (
    <Input
      ref={inputRef as RefObject<HTMLInputElement>}
      type="text"
      className="h-7 text-xs px-1"
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    />
  );
```

Insert the date case immediately **before** that block:

```tsx
  // Date fields — native date picker
  if (DATE_FIELDS.has(field)) {
    if (!editing) {
      return (
        <button
          className={cn("w-full rounded p-0.5 text-left transition-colors", readOnly ? "cursor-default" : "cursor-pointer hover:bg-[hsl(var(--surface))]")}
          onClick={() => { if (!readOnly) setEditing(true); }}
        >
          {getDisplayValue(field, rawValue)}
        </button>
      );
    }
    return (
      <Input
        ref={inputRef as RefObject<HTMLInputElement>}
        type="date"
        className="h-7 text-xs px-1"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
    );
  }

  // Default — text Input
```

- [ ] **Step 3: Verify the build compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 4: Manual smoke test**

1. Run `npm run dev`
2. Open a product detail sheet
3. Navigate to the "Upload Workflow" tab (where Date of Dispatch and Date Uploaded appear)
4. Click either date field to enter edit mode
5. Confirm the browser's native date picker appears (calendar popup on click)
6. Select a date and click away — confirm the value saves and displays correctly
7. Confirm no other field types are affected

- [ ] **Step 5: Commit**

```bash
git add components/products/inline-edit-cell.tsx
git commit -m "feat: add native date picker for date fields in inline edit cell"
```
