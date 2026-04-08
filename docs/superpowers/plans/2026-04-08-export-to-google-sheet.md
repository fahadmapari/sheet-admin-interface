# Export to Google Sheets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Export to Google Sheets" option to the products export dropdown that creates a new Google Spreadsheet with the visible data, shares it with the signed-in user as an editor, and opens it in a new tab.

**Architecture:** The client serializes visible columns/rows and POSTs to a new API route. The API route uses the existing service account to create a spreadsheet via the Sheets API, then shares it with the user's email via the Drive API. A new `getDriveClient()` singleton and `createAndShareSpreadsheet()` helper are added to `lib/sheets.ts`.

**Tech Stack:** Next.js 14 App Router, googleapis v140, next-auth v4, TypeScript, sonner (toasts), lucide-react

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `lib/sheets.ts` | Add Drive client singleton + `createAndShareSpreadsheet()` |
| Create | `app/api/export/google-sheet/route.ts` | POST handler — orchestrates sheet creation |
| Modify | `components/products/export-button.tsx` | New dropdown item with loading state |

---

### Task 1: Add Drive client and `createAndShareSpreadsheet` to `lib/sheets.ts`

**Files:**
- Modify: `lib/sheets.ts`

- [ ] **Step 1: Add `drive_v3` to the googleapis import and declare the Drive singleton**

  Open `lib/sheets.ts`. Change the first import line from:
  ```ts
  import { google, sheets_v4 } from 'googleapis';
  ```
  To:
  ```ts
  import { google, sheets_v4, drive_v3 } from 'googleapis';
  ```

  Then, directly after the line `let _sheetsClient: sheets_v4.Sheets | null = null;`, add:
  ```ts
  let _driveClient: drive_v3.Drive | null = null;
  ```

- [ ] **Step 2: Add `getDriveClient()` function**

  Add this function directly after the closing brace of `getSheetsClient()`:
  ```ts
  export function getDriveClient(): drive_v3.Drive {
    if (_driveClient) return _driveClient;

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: requireEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
        private_key: requireEnv('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/drive.file',
      ],
    });

    _driveClient = google.drive({ version: 'v3', auth });
    return _driveClient;
  }
  ```

- [ ] **Step 3: Add `createAndShareSpreadsheet()` function**

  Add this function at the very end of `lib/sheets.ts`:
  ```ts
  /**
   * Create a new Google Spreadsheet, populate it with headers + rows,
   * share it as an editor with userEmail, and return its edit URL.
   */
  export async function createAndShareSpreadsheet(
    title: string,
    headers: string[],
    rows: string[][],
    userEmail: string,
  ): Promise<string> {
    const sheets = getSheetsClient();
    const drive = getDriveClient();

    // 1. Create the spreadsheet
    const createRes = await sheets.spreadsheets.create({
      requestBody: { properties: { title } },
    });
    const spreadsheetId = createRes.data.spreadsheetId;
    if (!spreadsheetId) throw new Error('Failed to create spreadsheet: no ID returned');

    // 2. Write headers + data rows
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data: [{ range: 'Sheet1!A1', values: [headers, ...rows] }],
      },
    });

    // 3. Share with user as editor (best-effort — log and continue on failure)
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          type: 'user',
          role: 'writer',
          emailAddress: userEmail,
        },
      });
    } catch (err) {
      console.warn('createAndShareSpreadsheet: failed to share with user, sheet is still accessible via service account:', err);
    }

    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  }
  ```

- [ ] **Step 4: Verify TypeScript compiles**

  Run:
  ```bash
  npx tsc --noEmit
  ```
  Expected: no errors related to `lib/sheets.ts`.

- [ ] **Step 5: Commit**

  ```bash
  git add lib/sheets.ts
  git commit -m "feat: add getDriveClient and createAndShareSpreadsheet to sheets lib"
  ```

---

### Task 2: Create the API route

**Files:**
- Create: `app/api/export/google-sheet/route.ts`

- [ ] **Step 1: Create the directory and file**

  Create the file `app/api/export/google-sheet/route.ts` with this content:
  ```ts
  import { NextRequest, NextResponse } from 'next/server';
  import { getServerSession } from 'next-auth/next';
  import { authOptions } from '@/lib/auth';
  import { createAndShareSpreadsheet } from '@/lib/sheets';

  export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const { title, fields, rows } = (await req.json()) as {
        title: string;
        fields: string[];
        rows: string[][];
      };

      const url = await createAndShareSpreadsheet(title, fields, rows, session.user.email);
      return NextResponse.json({ url });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  Run:
  ```bash
  npx tsc --noEmit
  ```
  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add app/api/export/google-sheet/route.ts
  git commit -m "feat: add POST /api/export/google-sheet route"
  ```

---

### Task 3: Update the export button component

**Files:**
- Modify: `components/products/export-button.tsx`

- [ ] **Step 1: Add `useState` and `Loader2` imports**

  Change the first two import lines from:
  ```ts
  'use client';

  import { Download } from 'lucide-react';
  ```
  To:
  ```ts
  'use client';

  import { useState } from 'react';
  import { Download, Loader2 } from 'lucide-react';
  ```

- [ ] **Step 2: Add the `exportToGoogleSheets` handler inside `ExportButton`**

  Inside the `ExportButton` function body, after the line:
  ```ts
  const visibleFields = getVisibleFields(columnVisibility);
  ```
  Add:
  ```ts
  const [exportingToSheets, setExportingToSheets] = useState(false);

  async function exportToGoogleSheets() {
    setExportingToSheets(true);
    try {
      const fields = visibleFields.map((f) => FIELD_LABELS[f] ?? f);
      const rows = products.map((p) =>
        visibleFields.map((f) => getCellValue(p, f)),
      );
      const title = `Products export ${new Date().toISOString().slice(0, 10)}`;

      const res = await fetch('/api/export/google-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, fields, rows }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? 'Export failed');
      }

      const { url } = await res.json();
      window.open(url, '_blank');
      toast.success(`Opened in Google Sheets`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export to Google Sheets failed');
    } finally {
      setExportingToSheets(false);
    }
  }
  ```

- [ ] **Step 3: Add the new dropdown menu item**

  In the `return` block, after the existing XLSX `DropdownMenuItem` (line ~103), add:
  ```tsx
  <DropdownMenuItem
    onClick={exportToGoogleSheets}
    disabled={exportingToSheets}
  >
    {exportingToSheets ? (
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    ) : null}
    Export to Google Sheets
  </DropdownMenuItem>
  ```

- [ ] **Step 4: Verify TypeScript compiles**

  Run:
  ```bash
  npx tsc --noEmit
  ```
  Expected: no errors.

- [ ] **Step 5: Commit**

  ```bash
  git add components/products/export-button.tsx
  git commit -m "feat: add Export to Google Sheets option in export dropdown"
  ```

---

### Task 4: Manual end-to-end verification

- [ ] **Step 1: Start the dev server**

  ```bash
  npm run dev
  ```

- [ ] **Step 2: Sign in and navigate to the products page**

  Open `http://localhost:3000` in your browser, sign in with a Google account that is listed in `ALLOWED_EMAILS`.

- [ ] **Step 3: Open the export dropdown**

  Click the **Export** button. Verify three items appear:
  - Export as CSV
  - Export as XLSX
  - Export to Google Sheets

- [ ] **Step 4: Click "Export to Google Sheets"**

  Expected behaviour:
  1. The item shows a spinning loader and is disabled while the request is in progress
  2. A new browser tab opens with a Google Sheets URL (`https://docs.google.com/spreadsheets/d/.../edit`)
  3. A success toast appears: "Opened in Google Sheets"
  4. The new sheet contains the correct headers and data rows matching the visible columns

- [ ] **Step 5: Verify editor access**

  In the newly opened sheet, confirm you can edit a cell (the signed-in user was shared as `writer`).

- [ ] **Step 6: Verify build passes**

  ```bash
  npm run build
  ```
  Expected: build completes with no errors.
