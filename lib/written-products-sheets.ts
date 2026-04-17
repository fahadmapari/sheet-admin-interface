// lib/written-products-sheets.ts
import 'server-only';
import { getUserSheetsClient } from '@/lib/sheets';

function getSpreadsheetId(): string {
  const v = process.env.WRITTEN_PRODUCTS_SPREADSHEET_ID;
  if (!v) throw new Error('Missing required environment variable: WRITTEN_PRODUCTS_SPREADSHEET_ID');
  return v;
}

const SHEET_NAME = 'Sheet1';
const RANGE = `'${SHEET_NAME}'!A:M`;

let _cachedSheetId: number | null = null;

async function resolveSheetId(accessToken: string): Promise<number> {
  if (_cachedSheetId !== null) return _cachedSheetId;
  const sheets = getUserSheetsClient(accessToken);
  const res = await sheets.spreadsheets.get({ spreadsheetId: getSpreadsheetId() });
  const id = res.data.sheets?.[0]?.properties?.sheetId;
  if (id === undefined || id === null) throw new Error('Cannot determine sheet ID for written products');
  _cachedSheetId = id;
  return id;
}

export async function fetchAllWrittenProductRows(accessToken: string): Promise<string[][]> {
  const sheets = getUserSheetsClient(accessToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: RANGE,
  });
  return (res.data.values ?? []) as string[][];
}

export async function appendWrittenProductRow(accessToken: string, values: string[]): Promise<number> {
  const sheets = getUserSheetsClient(accessToken);
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: RANGE,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });
  const updatedRange = res.data.updates?.updatedRange ?? '';
  const match = updatedRange.match(/:?[A-Z]+(\d+)/);
  if (!match) throw new Error(`Could not parse row index from updatedRange: ${updatedRange}`);
  return parseInt(match[1], 10);
}

export async function updateWrittenProductRow(
  accessToken: string,
  rowIndex: number,
  values: string[],
): Promise<void> {
  const sheets = getUserSheetsClient(accessToken);
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `'${SHEET_NAME}'!A${rowIndex}:M${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  });
}

export async function deleteWrittenProductRow(accessToken: string, rowIndex: number): Promise<void> {
  if (rowIndex < 2) throw new Error('rowIndex must be >= 2; received ' + rowIndex);
  const sheets = getUserSheetsClient(accessToken);
  const sheetId = await resolveSheetId(accessToken);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
  });
}
