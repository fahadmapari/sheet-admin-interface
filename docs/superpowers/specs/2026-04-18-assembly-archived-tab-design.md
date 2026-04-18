# Assembly Line — Archived Tab Design

**Date:** 2026-04-18
**Status:** Approved

## Overview

Batches that have been in the "Uploaded" stage for more than 7 days are moved out of the main Assembly Line view into a separate read-only "Archived" tab, keeping the active workflow uncluttered.

## Data Layer

### `AssemblyBatch` type (`lib/types.ts`)

Add one optional field:

```ts
uploadedAt?: string; // ISO string, set when batch moves to "Uploaded"
```

### Move API (`app/api/assembly/move/route.ts`)

When `targetStage === 'Uploaded'`, set `uploadedAt: new Date()` on the upserted/inserted batch document alongside the existing `stage` update.

For the existing-batch reuse path (same stage+name), also set `uploadedAt` via `$set`.

### GET `/api/assembly` (`app/api/assembly/route.ts`)

When mapping the "Uploaded" stage, exclude batches where the age threshold is met:

- Age = `uploadedAt ?? createdAt`
- Threshold = 7 days (604 800 000 ms)
- Batches older than threshold are excluded from the response entirely.

The `uploadedAt` field is included in each mapped batch object so the client has it.

### New endpoint `GET /api/assembly/archived` (`app/api/assembly/archived/route.ts`)

Queries `assembly_batches` where:
- `stage === 'Uploaded'`
- `(uploadedAt ?? createdAt) < now - 7 days`

Returns:
```ts
{ batches: AssemblyBatch[] }
```

Sorted by `uploadedAt ?? createdAt` descending (newest first).

## UI

### `assembly-client.tsx`

- Wrap the page content in shadcn `Tabs` with two values: `"current"` and `"archived"`.
- Tab triggers: **Assembly Line** and **Archived** (with a count badge showing the number of archived batches).
- The archived tab has its own SWR hook: `useSWR<{ batches: AssemblyBatch[] }>('/api/assembly/archived', fetcher)`.
- The archived tab renders a single `StageSection` for the `"Uploaded"` stage with `readOnly={true}` and no action handlers passed.

### `components/assembly/stage-section.tsx`

Add a `readOnly?: boolean` prop. When `true`:
- Do not render move-to-next-stage buttons, move-to-stage dropdowns, or remove buttons.
- The section is purely informational.

## Archive Threshold

7 days (hardcoded constant). No UI control to change it.

## Fallback for Existing Batches

Batches already in "Uploaded" with no `uploadedAt` field use `createdAt` as the age reference. This is a safe approximation — it may cause some old batches to appear in "Current" briefly if their `createdAt` is recent, but they will naturally migrate to Archived once 7 days passes from their creation date.

## Out of Scope

- Unarchiving / moving batches back from the Archived tab (read-only).
- Configurable archive threshold.
- Deleting archived batches.
