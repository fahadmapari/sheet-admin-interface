import { google, sheets_v4 } from 'googleapis';

// ---------------------------------------------------------------------------
// Singleton client
// ---------------------------------------------------------------------------

let _sheetsClient: sheets_v4.Sheets | null = null;

export function getSheetsClient(): sheets_v4.Sheets {
  if (_sheetsClient) return _sheetsClient;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  _sheetsClient = google.sheets({ version: 'v4', auth });
  return _sheetsClient;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPREADSHEET_ID = process.env.SPREADSHEET_ID as string;
const NET_RATES_RANGE = "'NET RATES'!A:BR";
const INVENTORY_UPDATE_RANGE = "'Inventory Update'!A:Z";

// ---------------------------------------------------------------------------
// Helper: column index (0-based) → A1 column letter(s)
// A=0, B=1, …, Z=25, AA=26, …, BR=69
// ---------------------------------------------------------------------------

function colIndexToLetter(colIndex: number): string {
  let letter = '';
  let n = colIndex;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

// ---------------------------------------------------------------------------
// Helper: sheet ID cache + lookup
// ---------------------------------------------------------------------------

const sheetIdCache = new Map<string, number>();

async function getSheetId(sheetName: string): Promise<number> {
  if (sheetIdCache.has(sheetName)) {
    return sheetIdCache.get(sheetName)!;
  }

  const sheets = getSheetsClient();
  try {
    const response = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetsData = response.data.sheets ?? [];
    for (const sheet of sheetsData) {
      const title = sheet.properties?.title;
      const id = sheet.properties?.sheetId;
      if (title !== undefined && title !== null && id !== undefined && id !== null) {
        sheetIdCache.set(title, id);
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to get sheet ID for "${sheetName}": ${message}`);
  }

  if (!sheetIdCache.has(sheetName)) {
    throw new Error(`Sheet "${sheetName}" not found in spreadsheet`);
  }

  return sheetIdCache.get(sheetName)!;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch ALL rows from the "NET RATES" sheet.
 * Row 0 is the header row; Row 1+ are data rows.
 * Returns raw string[][] (70 columns A–BR).
 */
export async function fetchAllRows(): Promise<string[][]> {
  const sheets = getSheetsClient();
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
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
export async function fetchRow(rowIndex: number): Promise<string[]> {
  const sheets = getSheetsClient();
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'NET RATES'!A${rowIndex}:BR${rowIndex}`,
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
export async function updateRow(rowIndex: number, values: string[]): Promise<void> {
  const sheets = getSheetsClient();
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'NET RATES'!A${rowIndex}:BR${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
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
  rowIndex: number,
  colIndex: number,
  value: string,
): Promise<void> {
  const sheets = getSheetsClient();
  const colLetter = colIndexToLetter(colIndex);
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'NET RATES'!${colLetter}${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
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
 */
export async function appendRow(values: string[]): Promise<void> {
  const sheets = getSheetsClient();
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: NET_RATES_RANGE,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [values] },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to append row: ${message}`);
  }
}

/**
 * Delete a row by 1-based row index.
 * Shifts all subsequent rows up.
 */
export async function deleteRow(rowIndex: number): Promise<void> {
  const sheets = getSheetsClient();
  const sheetId = await getSheetId('NET RATES');
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
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
 * Batch update multiple rows at once for efficiency.
 * updates is an array of { rowIndex: number, values: string[] }.
 */
export async function batchUpdateRows(
  updates: Array<{ rowIndex: number; values: string[] }>,
): Promise<void> {
  if (updates.length === 0) return;

  const sheets = getSheetsClient();
  try {
    const data: sheets_v4.Schema$ValueRange[] = updates.map(({ rowIndex, values }) => ({
      range: `'NET RATES'!A${rowIndex}:BR${rowIndex}`,
      values: [values],
    }));

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to batch update rows: ${message}`);
  }
}

/**
 * Fetch the "Inventory Update" sheet.
 * Returns raw string[][].
 */
export async function fetchInventoryUpdate(): Promise<string[][]> {
  const sheets = getSheetsClient();
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: INVENTORY_UPDATE_RANGE,
    });
    return (response.data.values ?? []) as string[][];
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch Inventory Update sheet: ${message}`);
  }
}
