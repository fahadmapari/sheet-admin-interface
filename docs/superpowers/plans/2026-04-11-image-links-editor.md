# Image Links Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain text input for `imageLinks` in the product detail sheet with a structured editor showing one row per entry, each with a Label input, a URL input, and a remove button, plus an "Add image link" button.

**Architecture:** A new `ImageLinksEditor` component is added inside `product-detail-tabs.tsx`. It converts the raw newline-separated `Display Text||URL` string to/from an array of `{ text, url }` entries using the existing `parseLinkField` utility. A `Controller` wrapper integrates it with react-hook-form. No new files, no API changes, no data model changes.

**Tech Stack:** React, react-hook-form (Controller), lucide-react (X icon), shadcn/ui (Button, Input, Label), existing `parseLinkField` from `@/lib/utils`

---

### Task 1: Add `ImageLinksEditor` component

**Files:**
- Modify: `components/products/product-detail-tabs.tsx`

- [ ] **Step 1: Add `X` to the lucide-react import**

In [components/products/product-detail-tabs.tsx](components/products/product-detail-tabs.tsx), find the lucide-react import line:

```ts
import { ArrowLeft, ExternalLink, RotateCcw, Save } from 'lucide-react';
```

Replace with:

```ts
import { ArrowLeft, ExternalLink, RotateCcw, Save, X } from 'lucide-react';
```

- [ ] **Step 2: Add `useState` to the React import**

Find:

```ts
import { useEffect, useMemo } from 'react';
```

Replace with:

```ts
import { useEffect, useMemo, useState } from 'react';
```

- [ ] **Step 3: Add `parseLinkField` import**

After the existing imports block, add:

```ts
import { parseLinkField } from '@/lib/utils';
```

- [ ] **Step 4: Add the `ImageLinksEditor` component**

Insert the following component definition just above the `// ---------------------------------------------------------------------------` comment that precedes the `// Main client component` section (around line 451):

```tsx
// ---------------------------------------------------------------------------
// ImageLinksEditor
// ---------------------------------------------------------------------------

interface LinkEntry {
  text: string;
  url: string;
}

function serializeEntries(entries: LinkEntry[]): string {
  return entries
    .filter((e) => e.text.trim() || e.url.trim())
    .map((e) => (e.text && e.url ? `${e.text}||${e.url}` : e.url || e.text))
    .join('\n');
}

function parseEntries(value: string | null | undefined): LinkEntry[] {
  return (value ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseLinkField);
}

function ImageLinksEditor({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (value: string) => void;
}) {
  const [entries, setEntries] = useState<LinkEntry[]>(() => parseEntries(value));

  // Sync when the form resets externally
  useEffect(() => {
    setEntries(parseEntries(value));
  }, [value]);

  function updateEntries(next: LinkEntry[]) {
    setEntries(next);
    onChange(serializeEntries(next));
  }

  function handleChange(index: number, key: keyof LinkEntry, val: string) {
    const next = entries.map((e, i) => (i === index ? { ...e, [key]: val } : e));
    updateEntries(next);
  }

  function handleRemove(index: number) {
    updateEntries(entries.filter((_, i) => i !== index));
  }

  function handleAdd() {
    updateEntries([...entries, { text: '', url: '' }]);
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            className="flex-1"
            placeholder="Label"
            value={entry.text}
            onChange={(e) => handleChange(i, 'text', e.target.value)}
          />
          <Input
            className="flex-[2]"
            placeholder="https://..."
            value={entry.url}
            onChange={(e) => handleChange(i, 'url', e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleRemove(i)}
            title="Remove"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAdd}
      >
        + Add image link
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: Verify the app still compiles**

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors. (The component isn't wired up yet so nothing should be broken.)

- [ ] **Step 6: Commit**

```bash
git add components/products/product-detail-tabs.tsx
git commit -m "feat: add ImageLinksEditor component (not yet wired up)"
```

---

### Task 2: Wire `ImageLinksEditor` into the `renderField` function

**Files:**
- Modify: `components/products/product-detail-tabs.tsx`

- [ ] **Step 1: Add the `imageLinks` branch in `renderField`**

In `product-detail-tabs.tsx`, find the `renderField` function. Locate the block that starts the URL_FIELDS branch:

```tsx
  // URL fields → Input type="url" + external link button
  if (URL_FIELDS.has(fieldName)) {
```

Insert the following **before** that block:

```tsx
  // imageLinks → structured multi-entry editor
  if (fieldName === 'imageLinks') {
    return (
      <div className="space-y-1.5">
        <Label className="font-medium">{label}</Label>
        <Controller
          name="imageLinks"
          control={control}
          render={({ field }) => (
            <ImageLinksEditor value={field.value} onChange={field.onChange} />
          )}
        />
        {error && <p className="text-xs text-destructive">{error.message as string}</p>}
      </div>
    );
  }
```

- [ ] **Step 2: Verify dev server renders correctly**

```bash
npm run dev
```

Open a product detail sheet in the browser. Navigate to the tab that shows the `imageLinks` field (Image Links label). Confirm:
- Existing entries appear as separate rows with their label and URL pre-filled.
- Changing a field updates the value (save the product and verify the sheet reflects the change).
- Clicking `×` removes that row.
- Clicking `+ Add image link` appends a new empty row.
- Saving a product with entries round-trips correctly (newline-separated `Label||URL` in the sheet).

- [ ] **Step 3: Commit**

```bash
git add components/products/product-detail-tabs.tsx
git commit -m "feat: wire ImageLinksEditor for imageLinks field in product detail sheet"
```
