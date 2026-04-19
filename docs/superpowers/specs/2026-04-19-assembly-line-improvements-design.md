# Assembly Line Improvements Design

**Date:** 2026-04-19  
**Status:** Approved

## Problem

Two pain points with the current assembly line:

1. **No progress visibility** — you must expand every batch to understand overall pipeline state. No way to see how long a batch has been stuck in a stage.
2. **No ownership tracking** — stage-specific team assignments exist informally but are not tracked in the app. Multiple people from a team (e.g. operations) can handle a given stage.

## Solution Overview

Approach 2 (Pipeline Summary Bar + Ownership):

- **Pipeline summary bar**: collapsible horizontal tile row at the top showing product counts and staleness indicators per stage — no expanding required
- **Batch staleness badges**: color-coded age badges on each batch card showing days in current stage
- **Stage ownership**: multi-person team assignment per stage, stored in MongoDB, editable by admins, visible to all

---

## Data Model

### New: `stageconfig` collection (MongoDB)

Single singleton document:

```ts
interface StageConfig {
  _id: 'singleton';
  owners: Partial<Record<AssemblyStage, string[]>>;
}
// e.g. { owners: { "Buying Price": ["alice@example.com", "bob@example.com"] } }
```

### Modified: `AssemblyBatch`

New optional field:

```ts
interface AssemblyBatch {
  // ... existing fields
  movedToStageAt?: string; // ISO timestamp — set when batch enters a stage
}
```

Batches without `movedToStageAt` fall back to `createdAt` for staleness calculation.

---

## Components

### `PipelineSummary` (new)

- Horizontal row of 6 tiles, one per `ASSEMBLY_STAGES` entry
- Each tile shows: stage name, total product count, staleness dot (yellow = any batch 3–7d, red = any batch >7d)
- Rendered above the Tabs component in `AssemblyClient`
- Reads from already-fetched `assemblyData` SWR — no extra API call
- Clicking a tile scrolls to the corresponding `StageSection` and expands it if collapsed
- Hidden on the Archived tab

### `BatchCard` — staleness badge

- Replaces the current absolute `createdAt` date label
- Shows `Xd in stage` badge using `batch.movedToStageAt ?? batch.createdAt`
- No badge when < 3 days (green / no noise)
- Yellow badge: 3–7 days
- Red badge: > 7 days
- Not shown on `Uploaded` stage batches

### `StageSection` — ownership display

- Stage header right side shows assigned team members as initials chips with email tooltips
- Admin-only: `+ Assign team` button when no owners set; clicking chip group opens edit popover
- Edit popover: multi-select from existing app users (fetched from `/api/access-control` allowlist)
- Saves via PATCH to `/api/assembly/stage-config`
- Mobile: collapses to count badge only

---

## API

### New: `/api/assembly/stage-config`

| Method | Auth       | Body                                  | Description                        |
|--------|------------|---------------------------------------|------------------------------------|
| GET    | Any user   | —                                     | Returns full `StageConfig` document |
| PATCH  | Admin only | `{ stage: AssemblyStage, emails: string[] }` | Replaces owner list for one stage |

### Modified: `/api/assembly` (GET)

- Include `movedToStageAt` in returned batch documents

### Modified: `/api/assembly` (POST — batch creation)

- Set `movedToStageAt = new Date().toISOString()` on the new batch document at creation time

### Modified: `/api/assembly/move` (POST)

- Set `movedToStageAt = new Date().toISOString()` on each batch when it enters a new stage

---

## Data Flow

```
AssemblyClient
  ├── SWR /api/assembly          → assemblyData (batches + movedToStageAt)
  ├── SWR /api/assembly/stage-config → stageConfig (owners per stage)
  ├── SWR /api/access-control    → allowedEmails (for owner picker)
  │
  ├── PipelineSummary            ← assemblyData
  │
  └── Tabs
        └── StageSection (×6)   ← batches, stageConfig.owners[stage]
              └── BatchCard      ← batch.movedToStageAt (staleness)
```

---

## Error Handling

- If `stageconfig` document doesn't exist yet, GET returns `{ owners: {} }` (no error)
- PATCH is idempotent — passing an empty array clears the stage's owners
- Staleness calculation is client-side only — no server dependency

---

## Out of Scope

- Per-batch assignees (distinct from stage owners)
- Notification integration for stage owners
- Filter/search across batches
