# Next.js Upgrade (14 → 16) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Next.js from `^14.2.5` to `16.2.3` (latest), React 18 → React 19, and fix all breaking changes.

**Architecture:** Use the official `@next/codemod` CLI to handle the bulk of automated migrations, then manually fix the async `params` breaking change in the 3 dynamic-route files, update TypeScript types, and verify the build.

**Tech Stack:** Next.js 16, React 19, next-auth v4 (unchanged), TypeScript 5, Tailwind 3

---

## Current State

| Package | Current | Target |
|---|---|---|
| `next` | `^14.2.5` | `16.2.3` |
| `react` / `react-dom` | `^18.3.1` | `^19.x` |
| `@types/react` / `@types/react-dom` | `^18.x` | `^19.x` |
| `eslint-config-next` | `^14.2.5` | `^16.x` |

## Key Breaking Changes (14 → 15/16)

1. **`params` is now a Promise** in server components and route handlers — must `await params` before accessing properties.
2. **`fetch()` caching** — no longer cached by default. Already mitigated: every route/page uses `export const dynamic = 'force-dynamic'`.
3. **React 19** — required peer dependency for Next.js 15+.
4. **`eslint-config-next`** — must match the Next.js major version.

## Files to Modify

| File | Change |
|---|---|
| `package.json` | Bump `next`, `react`, `react-dom`, `@types/react`, `@types/react-dom`, `eslint-config-next` |
| `app/(app)/products/[rowIndex]/page.tsx` | Await `params` before reading `params.rowIndex` |
| `app/api/products/[rowIndex]/route.ts` | Await `params` in PUT, PATCH, DELETE handlers |
| `app/api/assembly/product/[rowIndex]/route.ts` | Await `params` in GET handler |

---

## Task 1: Run the official Next.js upgrade codemod

The codemod auto-migrates config, route signatures, and common patterns.

**Files:** `package.json`, `next.config.mjs`, any route/page files it detects

- [ ] **Step 1: Run the codemod**

```bash
npx @next/codemod@latest upgrade
```

When prompted:
- Select **Next.js 16** as the target version
- Allow it to update `package.json` and run `npm install`
- Accept all proposed code transformations

- [ ] **Step 2: Verify package versions after codemod**

```bash
cat package.json | grep -E '"next"|"react"'
```

Expected: `next` at `^16.x`, `react` at `^19.x`.

- [ ] **Step 3: Commit codemod changes**

```bash
git add -A
git commit -m "chore: run next/codemod upgrade to Next.js 16"
```

---

## Task 2: Fix async `params` in the product detail page

The page server component receives `params` as a Promise in Next.js 15+.

**File:** `app/(app)/products/[rowIndex]/page.tsx`

- [ ] **Step 1: Open and read the file**

Current content at line 9–14:
```tsx
export default async function ProductDetailPage({
  params,
}: {
  params: { rowIndex: string };
}) {
  const rowIndex = parseInt(params.rowIndex, 10);
```

- [ ] **Step 2: Apply the async params fix**

Replace the function signature and `rowIndex` extraction:

```tsx
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ rowIndex: string }>;
}) {
  const { rowIndex: rowIndexStr } = await params;
  const rowIndex = parseInt(rowIndexStr, 10);
```

- [ ] **Step 3: Verify the full file looks correct**

```bash
cat app/\(app\)/products/\[rowIndex\]/page.tsx
```

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/products/[rowIndex]/page.tsx"
git commit -m "fix: await params in product detail page (Next.js 16)"
```

---

## Task 3: Fix async `params` in `app/api/products/[rowIndex]/route.ts`

Three route handlers (PUT, PATCH, DELETE) all destructure `params` synchronously.

**File:** `app/api/products/[rowIndex]/route.ts`

- [ ] **Step 1: Update the shared `Params` type at line 10**

Current:
```ts
type Params = { params: { rowIndex: string } };
```

Replace with:
```ts
type Params = { params: Promise<{ rowIndex: string }> };
```

- [ ] **Step 2: Fix the PUT handler (lines 12–13)**

Current:
```ts
export async function PUT(req: NextRequest, { params }: Params) {
  const rowIndex = parseInt(params.rowIndex, 10);
```

Replace with:
```ts
export async function PUT(req: NextRequest, { params }: Params) {
  const { rowIndex: rowIndexStr } = await params;
  const rowIndex = parseInt(rowIndexStr, 10);
```

- [ ] **Step 3: Fix the PATCH handler (lines 56–57)**

Current:
```ts
export async function PATCH(req: NextRequest, { params }: Params) {
  const rowIndex = parseInt(params.rowIndex, 10);
```

Replace with:
```ts
export async function PATCH(req: NextRequest, { params }: Params) {
  const { rowIndex: rowIndexStr } = await params;
  const rowIndex = parseInt(rowIndexStr, 10);
```

- [ ] **Step 4: Fix the DELETE handler (lines 95–96)**

Current:
```ts
export async function DELETE(_req: NextRequest, { params }: Params) {
  const rowIndex = parseInt(params.rowIndex, 10);
```

Replace with:
```ts
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { rowIndex: rowIndexStr } = await params;
  const rowIndex = parseInt(rowIndexStr, 10);
```

- [ ] **Step 5: Commit**

```bash
git add "app/api/products/[rowIndex]/route.ts"
git commit -m "fix: await params in products API route handlers (Next.js 16)"
```

---

## Task 4: Fix async `params` in `app/api/assembly/product/[rowIndex]/route.ts`

**File:** `app/api/assembly/product/[rowIndex]/route.ts`

- [ ] **Step 1: Fix the GET handler (lines 7–11)**

Current:
```ts
export async function GET(
  _req: NextRequest,
  { params }: { params: { rowIndex: string } },
) {
  const rowIndex = parseInt(params.rowIndex, 10);
```

Replace with:
```ts
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ rowIndex: string }> },
) {
  const { rowIndex: rowIndexStr } = await params;
  const rowIndex = parseInt(rowIndexStr, 10);
```

- [ ] **Step 2: Commit**

```bash
git add "app/api/assembly/product/[rowIndex]/route.ts"
git commit -m "fix: await params in assembly product route handler (Next.js 16)"
```

---

## Task 5: Handle any packages the codemod missed

The codemod may not update every devDependency. Check and fix manually.

- [ ] **Step 1: Check current versions**

```bash
npm list next react react-dom eslint-config-next @types/react @types/react-dom 2>/dev/null | grep -E "next|react|eslint"
```

- [ ] **Step 2: If `eslint-config-next` is still at v14, upgrade it**

```bash
npm install --save-dev eslint-config-next@latest
```

- [ ] **Step 3: If `@types/react` or `@types/react-dom` are still at v18, upgrade**

```bash
npm install --save-dev @types/react@latest @types/react-dom@latest
```

- [ ] **Step 4: Commit any package changes**

```bash
git add package.json package-lock.json
git commit -m "chore: update remaining devDependencies for Next.js 16 / React 19"
```

---

## Task 6: Verify the build

- [ ] **Step 1: Run TypeScript type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see errors like `Type '{ rowIndex: string }' is not assignable to type 'Promise<...>'`, you have a remaining params site — apply the same `await params` fix from Tasks 2–4.

- [ ] **Step 2: Run the production build**

```bash
npm run build
```

Expected: Compiled successfully. If you see warnings about deprecated APIs, note them but don't block — warnings don't fail the build.

- [ ] **Step 3: Run the dev server and do a smoke test**

```bash
npm run dev
```

Open `http://localhost:3000` and verify:
- Login page loads
- Products list loads (SWR fetches `/api/products`)
- Clicking into a product detail page (`/products/[rowIndex]`) loads correctly
- Assembly page loads
- Settings page loads

- [ ] **Step 4: Commit final state if needed**

```bash
git add -A
git commit -m "chore: verify Next.js 16 upgrade complete"
```

---

## Verification Summary

| Check | Command | Expected |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | Compiled successfully |
| Dev server | `npm run dev` | App loads at localhost:3000 |
| Products API | `curl http://localhost:3000/api/products` | JSON array of products |
| Product detail | Visit `/products/2` | Product detail renders |

---

## Notes & Risks

- **`next-auth` v4**: Officially targets Next.js 13/14. It runs on 15+ but may show deprecation warnings. The `[...nextauth]/route.ts` handler is entirely managed by next-auth internally — no changes needed to our code. A full migration to `next-auth v5` / Auth.js is a separate future task.
- **`mongodb` v7**: Compatible — no changes needed.
- **`recharts`, `xlsx`, `googleapis`**: Not affected by the Next.js or React upgrade.
- **Turbopack**: Next.js 15+ enables Turbopack by default for `next dev`. It is faster but if you hit build issues, fall back with `next dev --no-turbo`.
