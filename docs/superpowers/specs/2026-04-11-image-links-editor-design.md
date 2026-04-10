# Image Links Editor — Design Spec

**Date:** 2026-04-11  
**Scope:** Product detail sheet (`product-detail-tabs.tsx`) only

---

## Background

`imageLinks` is a `string | null` field stored as newline-separated entries, where each entry follows the format `Display Text||https://url` (or a bare URL, or plain text). Currently the field renders as a plain text input in the product detail form — providing no structure and requiring users to manually type the `||` separator syntax.

## Goal

Replace the plain text input for `imageLinks` in the product detail sheet with a structured editor that shows one row per entry, each with separate Label and URL inputs, plus add/remove controls.

---

## Component Design

### `ImageLinksEditor`

A new controlled component defined inside `product-detail-tabs.tsx`. No new files required.

**Props:**
```ts
interface ImageLinksEditorProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
}
```

**Internal state:**
```ts
type LinkEntry = { text: string; url: string };
const [entries, setEntries] = useState<LinkEntry[]>([]);
```

### Parsing (string → entries)

On mount and when `value` changes from outside (e.g. reset), parse via the existing `parseLinkField` utility from `@/lib/utils`:

```ts
const parsed = (value ?? '')
  .split(/\r?\n/)
  .map(l => l.trim())
  .filter(Boolean)
  .map(parseLinkField);
setEntries(parsed.length ? parsed : []);
```

### Serialization (entries → string)

On every internal state change, reassemble and call `onChange`:

```ts
const serialized = entries
  .filter(e => e.text.trim() || e.url.trim())
  .map(e => e.text && e.url ? `${e.text}||${e.url}` : e.url || e.text)
  .join('\n');
onChange(serialized);
```

Empty entries (both fields blank) are omitted from serialization.

### UI Layout

```
[Label input ............] [URL input ......................] [×]
[Label input ............] [URL input ......................] [×]
[+ Add image link]
```

- Label input: `placeholder="Label"`, `flex-1`
- URL input: `placeholder="https://..."`, `flex-2`
- Remove button: icon-only `×` (using `X` from lucide-react), `variant="ghost"`, `size="icon"`
- Add button: text button `"+ Add image link"`, `variant="outline"`, `size="sm"`, full-width or left-aligned

### Integration in `product-detail-tabs.tsx`

Replace the current default `<Input>` rendering for `imageLinks` with a `<Controller>` that renders `<ImageLinksEditor>`:

```tsx
if (fieldName === 'imageLinks') {
  return (
    <div className="space-y-1.5">
      <Label className="font-medium">{label}</Label>
      <Controller
        name="imageLinks"
        control={control}
        render={({ field }) => (
          <ImageLinksEditor
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
    </div>
  );
}
```

This branch must be placed **before** the default text input fallback in the `renderField` function.

---

## Data Model

No changes to the underlying data model. `imageLinks` remains a `string | null` field. The `||` separator format and newline-separated storage are preserved exactly.

---

## Error Handling

- No URL validation — users may store plain text labels with no URL (existing behavior allows this).
- Form-level reset (react-hook-form `reset()`) will propagate the new value to `ImageLinksEditor` via the `value` prop, re-parsing and re-rendering entries.

---

## Out of Scope

- Reordering entries (drag-and-drop)
- Changes to the inline table cell editor (`ImageLinksCell` in `inline-edit-cell.tsx`)
- URL format validation
