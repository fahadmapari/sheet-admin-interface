import 'server-only';
import { google, drive_v3, sheets_v4 } from 'googleapis';
import { parseLinkField } from '@/lib/utils';
import { colIndexToLetter } from './column-mapping';

// ---------------------------------------------------------------------------
// Env var helper
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

// ---------------------------------------------------------------------------
// Explicit auth clients
// ---------------------------------------------------------------------------

export type SheetsAuthContext =
  | { auth: 'user'; accessToken: string }
  | { auth: 'service' };

let _serviceAccountSheetsClient: sheets_v4.Sheets | null = null;

export function getUserSheetsClient(accessToken: string): sheets_v4.Sheets {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.sheets({ version: 'v4', auth });
}

export function getUserDriveClient(accessToken: string): drive_v3.Drive {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
}

export function getServiceAccountSheetsClient(): sheets_v4.Sheets {
  if (_serviceAccountSheetsClient) return _serviceAccountSheetsClient;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: requireEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
      private_key: requireEnv('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  _serviceAccountSheetsClient = google.sheets({ version: 'v4', auth });
  return _serviceAccountSheetsClient;
}

function getSheetsClient(context: SheetsAuthContext): sheets_v4.Sheets {
  if (context.auth === 'service') {
    return getServiceAccountSheetsClient();
  }
  return getUserSheetsClient(context.accessToken);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

function getSpreadsheetId(): string {
  return requireEnv('SPREADSHEET_ID');
}
const NET_RATES_SHEET = 'NET RATES';
const NET_RATES_RANGE = `'${NET_RATES_SHEET}'!A:BR`;

// ---------------------------------------------------------------------------
// Helper: sheet ID cache + lookup (with promise deduplication)
// ---------------------------------------------------------------------------

const sheetIdCache = new Map<string, number>();
const sheetIdInflight = new Map<string, Promise<number>>();

async function getSheetId(context: SheetsAuthContext, sheetName: string): Promise<number> {
  if (sheetIdCache.has(sheetName)) return sheetIdCache.get(sheetName)!;
  if (sheetIdInflight.has(sheetName)) return sheetIdInflight.get(sheetName)!;

  const promise = (async () => {
    const sheets = getSheetsClient(context);
    const response = await sheets.spreadsheets.get({ spreadsheetId: getSpreadsheetId() });
    const sheetsData = response.data.sheets ?? [];
    for (const sheet of sheetsData) {
      const id = sheet.properties?.sheetId;
      const title = sheet.properties?.title;
      if (id !== undefined && id !== null && title) {
        sheetIdCache.set(title, id);
      }
    }
    const result = sheetIdCache.get(sheetName);
    if (result === undefined) throw new Error(`Sheet not found: ${sheetName}`);
    return result;
  })();

  sheetIdInflight.set(sheetName, promise);
  try {
    const result = await promise;
    return result;
  } finally {
    sheetIdInflight.delete(sheetName);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch ALL rows from the "NET RATES" sheet.
 * Row 0 is the header row; Row 1+ are data rows.
 * Returns raw string[][] (70 columns A–BR).
 */
export async function fetchAllRows(context: SheetsAuthContext): Promise<string[][]> {
  const sheets = getSheetsClient(context);
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: NET_RATES_RANGE,
    });
    return (response.data.values ?? []) as string[][];
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch all rows: ${message}`);
  }
}

/**
 * Fetch a single row by 1-based row index.
 * Row 1 = header, Row 2 = first data row.
 */
export async function fetchRow(context: SheetsAuthContext, rowIndex: number): Promise<string[]> {
  if (rowIndex < 1) throw new Error('rowIndex must be >= 1; received ' + rowIndex);
  const sheets = getSheetsClient(context);
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: `'${NET_RATES_SHEET}'!A${rowIndex}:BR${rowIndex}`,
    });
    const values = response.data.values;
    return (values && values[0] ? values[0] : []) as string[];
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch row ${rowIndex}: ${message}`);
  }
}

/**
 * Update a single row by 1-based row index.
 * values must be an array of 70 cell values (full row replacement).
 */
export async function updateRow(context: SheetsAuthContext, rowIndex: number, values: string[]): Promise<void> {
  if (rowIndex < 1) throw new Error('rowIndex must be >= 1; received ' + rowIndex);
  if (values.length > 70) throw new Error('updateRow: values array must not exceed 70 elements; received ' + values.length);
  const sheets = getSheetsClient(context);
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSpreadsheetId(),
      range: `'${NET_RATES_SHEET}'!A${rowIndex}:BR${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [values] },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to update row ${rowIndex}: ${message}`);
  }
}

/**
 * Update a single cell.
 * rowIndex is 1-based; colIndex is 0-based (A=0, B=1, …, BR=69).
 */
export async function updateCell(
  context: SheetsAuthContext,
  rowIndex: number,
  colIndex: number,
  value: string,
): Promise<void> {
  if (rowIndex < 1) throw new Error('rowIndex must be >= 1; received ' + rowIndex);
  const sheets = getSheetsClient(context);
  const colLetter = colIndexToLetter(colIndex);
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSpreadsheetId(),
      range: `'${NET_RATES_SHEET}'!${colLetter}${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[value]] },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to update cell ${colLetter}${rowIndex}: ${message}`);
  }
}

/**
 * Append a new row at the end of the data.
 * values should be an array of up to 70 cell values.
 * Returns the 1-based sheet row index of the newly appended row.
 */
export async function appendRow(context: SheetsAuthContext, values: string[]): Promise<number> {
  const sheets = getSheetsClient(context);
  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: getSpreadsheetId(),
      range: NET_RATES_RANGE,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [values] },
    });
    // updatedRange is like "'NET RATES'!A101:BR101" — extract the row number
    const updatedRange = response.data.updates?.updatedRange ?? '';
    const match = updatedRange.match(/:?[A-Z]+(\d+)/);
    if (!match) throw new Error(`Could not parse row index from updatedRange: ${updatedRange}`);
    return parseInt(match[1], 10);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to append row: ${message}`);
  }
}

/**
 * Delete a row by 1-based row index.
 * Shifts all subsequent rows up.
 */
export async function deleteRow(context: SheetsAuthContext, rowIndex: number): Promise<void> {
  if (rowIndex < 2) throw new Error('deleteRow: rowIndex must be >= 2 (row 1 is the header); received ' + rowIndex);
  const sheets = getSheetsClient(context);
  try {
    const sheetId = await getSheetId(context, NET_RATES_SHEET);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: getSpreadsheetId(),
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1, // 0-based for batchUpdate
                endIndex: rowIndex,
              },
            },
          },
        ],
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to delete row ${rowIndex}: ${message}`);
  }
}

/**
 * Fetch hyperlinks for a single column (0-based colIndex) across all data rows.
 * Returns a Map<rowIndex (1-based), hyperlink URL>.
 * Only entries with an actual hyperlink are included.
 */
export async function fetchColumnHyperlinks(context: SheetsAuthContext, colIndex: number): Promise<Map<number, string>> {
  const sheets = getSheetsClient(context);
  const colLetter = colIndexToLetter(colIndex);
  // Row 1 is the header — fetch from row 2 onward
  const range = `'${NET_RATES_SHEET}'!${colLetter}2:${colLetter}`;

  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: getSpreadsheetId(),
      ranges: [range],
      includeGridData: true,
    });

    const result = new Map<number, string>();
    const rowData = response.data.sheets?.[0]?.data?.[0]?.rowData ?? [];
    rowData.forEach((row, idx) => {
      const hyperlink = row.values?.[0]?.hyperlink;
      if (hyperlink) {
        result.set(idx + 2, hyperlink); // idx 0 = sheet row 2 (first data row)
      }
    });
    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch hyperlinks for column ${colLetter}: ${message}`);
  }
}

/**
 * Update a single cell's value and hyperlink using batchUpdate.
 * If url is empty, the hyperlink is cleared.
 * rowIndex is 1-based; colIndex is 0-based.
 */
export async function updateCellHyperlink(
  context: SheetsAuthContext,
  rowIndex: number,
  colIndex: number,
  displayText: string,
  url: string,
): Promise<void> {
  if (rowIndex < 1) throw new Error('rowIndex must be >= 1; received ' + rowIndex);
  const sheets = getSheetsClient(context);
  const sheetId = await getSheetId(context, NET_RATES_SHEET);

  // When url is absent, omitting textFormat.link from the body while including it
  // in the fields mask causes the Sheets API to clear the existing hyperlink.
  const cellData: sheets_v4.Schema$CellData = {
    userEnteredValue: { stringValue: displayText },
    ...(url ? { userEnteredFormat: { textFormat: { link: { uri: url } } } } : {}),
  };

  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: getSpreadsheetId(),
      requestBody: {
        requests: [
          {
            updateCells: {
              rows: [{ values: [cellData] }],
              fields: 'userEnteredValue,userEnteredFormat.textFormat.link',
              range: {
                sheetId,
                startRowIndex: rowIndex - 1,
                endRowIndex: rowIndex,
                startColumnIndex: colIndex,
                endColumnIndex: colIndex + 1,
              },
            },
          },
        ],
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to update cell hyperlink at row ${rowIndex}, col ${colIndex}: ${message}`);
  }
}

/**
 * Fetch rich text links for a single column (0-based colIndex) across all data rows.
 * Returns a Map<rowIndex (1-based), normalized string>.
 *
 * For a cell with a single hyperlink:   "Display Text||https://url"
 * For a cell with multiple hyperlinks:  "Text1||url1\nText2||url2"
 * For plain text with no links:         the plain text
 *
 * Only entries with content are included.
 */
export async function fetchColumnRichTextLinks(context: SheetsAuthContext, colIndex: number): Promise<Map<number, string>> {
  const sheets = getSheetsClient(context);
  const colLetter = colIndexToLetter(colIndex);
  const range = `'${NET_RATES_SHEET}'!${colLetter}2:${colLetter}`;

  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: getSpreadsheetId(),
      ranges: [range],
      includeGridData: true,
    });

    const result = new Map<number, string>();
    const rowData = response.data.sheets?.[0]?.data?.[0]?.rowData ?? [];

    rowData.forEach((row, idx) => {
      const cell = row.values?.[0];
      if (!cell) return;

      const stringValue =
        cell.userEnteredValue?.stringValue ??
        cell.effectiveValue?.stringValue ??
        '';
      if (!stringValue) return;

      const sheetRowIndex = idx + 2;
      const textFormatRuns = cell.textFormatRuns ?? [];

      if (textFormatRuns.length === 0) {
        // No rich text runs — fall back to cell-level hyperlink
        const hyperlink = cell.hyperlink;
        result.set(sheetRowIndex, hyperlink ? `${stringValue}||${hyperlink}` : stringValue);
        return;
      }

      // Build segments from textFormatRuns; each run covers
      // [startIndex, nextRun.startIndex) within stringValue.
      const segments: string[] = [];
      for (let i = 0; i < textFormatRuns.length; i++) {
        const run = textFormatRuns[i];
        const nextRun = textFormatRuns[i + 1];
        const start = run.startIndex ?? 0;
        const end = nextRun?.startIndex ?? stringValue.length;
        const text = stringValue.slice(start, end).trim();
        const url = run.format?.link?.uri ?? '';
        if (!text) continue;
        segments.push(url ? `${text}||${url}` : text);
      }

      if (segments.length > 0) {
        result.set(sheetRowIndex, segments.join('\n'));
      }
    });

    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch rich text links for column ${colLetter}: ${message}`);
  }
}

/**
 * Batch update multiple rows at once for efficiency.
 * updates is an array of { rowIndex: number, values: string[] }.
 */
export async function batchUpdateRows(
  context: SheetsAuthContext,
  updates: Array<{ rowIndex: number; values: string[] }>,
): Promise<void> {
  if (updates.length === 0) return;

  const sheets = getSheetsClient(context);
  try {
    const data: sheets_v4.Schema$ValueRange[] = updates.map(({ rowIndex, values }) => ({
      range: `'${NET_RATES_SHEET}'!A${rowIndex}:BR${rowIndex}`,
      values: [values],
    }));

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: getSpreadsheetId(),
      requestBody: {
        valueInputOption: 'RAW',
        data,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to batch update rows: ${message}`);
  }
}

/**
 * Scan column F (link column, 0-based index 5) to find the row whose link title
 * matches the given string. Returns the 1-based rowIndex, or null if not found.
 * Title is the text portion of a `title||url` or plain-text cell value.
 */
export async function findRowByProductName(context: SheetsAuthContext, title: string): Promise<number | null> {
  if (!title) return null;
  const sheets = getSheetsClient(context);
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: `'${NET_RATES_SHEET}'!F2:F`,
    });
    const values = response.data.values ?? [];
    for (let i = 0; i < values.length; i++) {
      const cell = String(values[i]?.[0] ?? '');
      const { text } = parseLinkField(cell);
      if (text === title) {
        return i + 2; // i=0 → sheet row 2 (first data row)
      }
    }
    return null;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to find row by product name "${title}": ${message}`);
  }
}

/**
 * Create a new Google Spreadsheet in the user's own Drive using their OAuth access token,
 * populate it with headers + rows, and return its edit URL.
 * The user owns the file — no service account storage or sharing required.
 */
export async function createSpreadsheetAsUser(
  accessToken: string,
  title: string,
  headers: string[],
  rows: string[][],
): Promise<string> {
  const drive = getUserDriveClient(accessToken);
  const sheets = getUserSheetsClient(accessToken);

  // 1. Create the spreadsheet file in the user's Drive
  const createRes = await drive.files.create({
    requestBody: {
      name: title,
      mimeType: 'application/vnd.google-apps.spreadsheet',
    },
    fields: 'id',
  });
  const spreadsheetId = createRes.data.id;
  if (!spreadsheetId) throw new Error('Failed to create spreadsheet: no ID returned');

  // 2. Write headers + data rows
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: [{ range: 'Sheet1!A1', values: [headers, ...rows] }],
    },
  });

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

export async function getSpreadsheetCapabilities(accessToken: string): Promise<drive_v3.Schema$File['capabilities']> {
  const drive = getUserDriveClient(accessToken);
  const response = await drive.files.get({
    fileId: getSpreadsheetId(),
    fields: 'capabilities',
    supportsAllDrives: true,
  });
  return response.data.capabilities;
}

export async function shareSpreadsheetWithUser(accessToken: string, email: string): Promise<'created' | 'updated' | 'already_has_access'> {
  const drive = getUserDriveClient(accessToken);
  const spreadsheetId = getSpreadsheetId();
  const normalizedEmail = email.trim().toLowerCase();

  const permissions = await drive.permissions.list({
    fileId: spreadsheetId,
    fields: 'permissions(id,type,role,emailAddress)',
    supportsAllDrives: true,
  });

  const existing = permissions.data.permissions?.find((permission) => (
    permission.type === 'user' &&
    permission.emailAddress?.toLowerCase() === normalizedEmail
  ));

  if (existing?.id) {
    if (existing.role === 'writer' || existing.role === 'owner') {
      return 'already_has_access';
    }

    await drive.permissions.update({
      fileId: spreadsheetId,
      permissionId: existing.id,
      requestBody: { role: 'writer' },
      supportsAllDrives: true,
    });
    return 'updated';
  }

  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: {
      type: 'user',
      role: 'writer',
      emailAddress: normalizedEmail,
    },
    sendNotificationEmail: true,
    supportsAllDrives: true,
  });

  return 'created';
}
