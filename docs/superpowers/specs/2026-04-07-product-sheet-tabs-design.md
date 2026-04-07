# Product Sheet Tabs — Design Spec

**Date:** 2026-04-07

## Summary

Add a horizontal scrollable tab bar to `ProductDetailSheet` so users can jump directly to any section. Active tab updates as the user scrolls through the sheet content.

---

## Changes

### 1. Sheet Width

Change `sm:max-w-2xl` → `sm:max-w-4xl` on the `SheetContent` element.

### 2. Tab Bar

A `div` placed between the header `<div>` (ends at the border-b) and the `<ScrollArea>`, with:

- `overflow-x-auto` + `scrollbar-hide` for horizontal scrolling
- `border-b border-[hsl(var(--border))]`
- One `button` per section — all 9 tabs:
  - Overview, Pricing, Tour Configuration, Provider & Costs, Validity & Cancellation, Content Status, Upload Workflow, Notes, OTA Distribution
- Active tab style: bottom border indicator (`border-b-2 border-[hsl(var(--text-primary))]`) + full-opacity text
- Inactive tab style: muted text color, no border
- `whitespace-nowrap` on each button to prevent wrapping
- `px-4 py-2.5 text-sm` sizing

### 3. Section Refs

Inside the scroll body, each section `<div>` gets a ref. Stored as `useRef<Record<string, HTMLDivElement | null>>({})` keyed by section id. The OTA Distribution section also gets a ref using id `'ota'`.

### 4. Click-to-Scroll

```ts
function scrollToSection(id: string) {
  const el = sectionRefs.current[id];
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
```

### 5. Active Tab Tracking (IntersectionObserver)

```ts
useEffect(() => {
  const viewport = document.querySelector('[data-radix-scroll-area-viewport]');
  if (!viewport) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.getAttribute('data-section-id') ?? '');
        }
      }
    },
    { root: viewport, rootMargin: '-30% 0px -60% 0px', threshold: 0 },
  );

  for (const el of Object.values(sectionRefs.current)) {
    if (el) observer.observe(el);
  }

  return () => observer.disconnect();
}, [open]); // re-run when sheet opens
```

Each section element gets `data-section-id={section.id}` (and `'ota'` for OTA Distribution).

State: `const [activeSection, setActiveSection] = useState('overview')`.

---

## Sections Reference

| id         | Label                  |
|------------|------------------------|
| overview   | Overview               |
| pricing    | Pricing                |
| tour       | Tour Configuration     |
| provider   | Provider & Costs       |
| validity   | Validity & Cancellation|
| content    | Content Status         |
| upload     | Upload Workflow        |
| notes      | Notes                  |
| ota        | OTA Distribution       |

---

## Constraints

- All changes in `components/products/product-detail-sheet.tsx` — no new files
- No new dependencies
- Radix ScrollArea viewport is identified via `[data-radix-scroll-area-viewport]` selector
