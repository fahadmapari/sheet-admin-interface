# Export to Google Sheets — Design Spec

**Date:** 2026-04-08

## Summary

Add a third option to the export dropdown on the products page: **"Export to Google Sheets"**. Clicking it creates a new Google Spreadsheet pre-populated with the currently visible columns and filtered rows, shares it as an editor with the signed-in user's email, and opens it in a new browser tab.

---

## Architecture

### 1. UI — `components/products/export-button.tsx`

- Add a third `DropdownMenuItem`: "Export to Google Sheets"
- Client serializes visible data the same way `exportCsv` does: `visibleFields` → headers array, products → rows array
- POSTs `{ title, fields, rows }` to `/api/export/google-sheet`
- While awaiting: item shows a loading spinner and is disabled (prevent double-submit)
- On success: `window.open(url, '_blank')` + `toast.success('Opened in Google Sheets')`
- On error: `toast.error(message)`

### 2. API Route — `app/api/export/google-sheet/route.ts`

**Method:** `POST`

**Request body:**
```ts
{
  title: string;          // e.g. "Products export 2026-04-08"
  fields: string[];       // human-readable header labels
  rows: string[][];       // serialized cell values, one array per product
}
```

**Steps:**
1. Read user email from server session via `getServerSession(authOptions)`. Return 401 if no session.
2. Call `createAndShareSpreadsheet(title, fields, rows, userEmail)` from `lib/sheets.ts`.
3. Return `{ url }` on success; `{ error }` with appropriate status on failure.

**Response:**
```ts
{ url: string }   // https://docs.google.com/spreadsheets/d/<id>/edit
```

### 3. Lib — `lib/sheets.ts`

**Scope update:**
Add `https://www.googleapis.com/auth/drive.file` to the service account `scopes` array. This is the minimal scope — it only grants access to files the app itself creates, not the user's entire Drive.

**New singleton:**
```ts
getDriveClient(): drive_v3.Drive
```
Same singleton pattern as `getSheetsClient()`. Uses the same `GoogleAuth` credentials.

**New exported function:**
```ts
createAndShareSpreadsheet(
  title: string,
  headers: string[],
  rows: string[][],
  userEmail: string,
): Promise<string>  // returns the spreadsheet URL
```

Steps inside:
1. `spreadsheets.create` — creates empty spreadsheet with the given title
2. `spreadsheets.values.batchUpdate` — writes `[headers, ...rows]` to `Sheet1!A1`
3. `drive.permissions.create` — adds `userEmail` as `writer` (type: `user`, role: `writer`)
4. Return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`

---

## Data Flow

```
ExportButton (client)
  → serializes visible rows
  → POST /api/export/google-sheet
      → getServerSession → user email
      → createAndShareSpreadsheet()
          → spreadsheets.create
          → spreadsheets.values.batchUpdate
          → drive.permissions.create (writer, userEmail)
      → returns { url }
  → window.open(url, '_blank')
  → toast.success
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Not signed in | API returns 401; client toasts error |
| Google API failure | API returns 500 with message; client toasts error |
| Drive permission failure | Log warning, still return URL (sheet is created; user can manually access via service account sharing) |

---

## Constraints

- The service account must have the `drive.file` scope granted. No changes to the Google Cloud Console are needed — scopes are declared in the token request, not the console (for service accounts).
- The new sheet is owned by the service account, not the user. Sharing via `permissions.create` gives the user full edit access despite not owning it.
- No new environment variables are required.

---

## Out of Scope

- Choosing a specific Google Drive folder for the export
- Formatting (column widths, bold headers, frozen rows)
- Sharing with multiple users
