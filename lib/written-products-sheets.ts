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
const TEXT_LINK_COL = 'E';
const TEXT_LINK_COL_INDEX = 4;

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

export async function fetchTextLinkHyperlinks(accessToken: string): Promise<Map<number, string>> {
  const sheets = getUserSheetsClient(accessToken);
  const range = `'${SHEET_NAME}'!${TEXT_LINK_COL}2:${TEXT_LINK_COL}`;
  const response = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
    ranges: [range],
    includeGridData: true,
  });
  const result = new Map<number, string>();
  const rowData = response.data.sheets?.[0]?.data?.[0]?.rowData ?? [];
  (rowData as Array<{ values?: Array<{ hyperlink?: string }> }>).forEach((row, idx) => {
    const hyperlink = row.values?.[0]?.hyperlink;
    if (hyperlink) result.set(idx + 2, hyperlink);
  });
  return result;
}

export async function updateTextLinkHyperlink(
  accessToken: string,
  rowIndex: number,
  displayText: string,
  url: string,
): Promise<void> {
  const sheets = getUserSheetsClient(accessToken);
  const sheetId = await resolveSheetId(accessToken);
  const cellData = {
    userEnteredValue: { stringValue: displayText },
    ...(url ? { userEnteredFormat: { textFormat: { link: { uri: url } } } } : {}),
  };
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: {
      requests: [{
        updateCells: {
          rows: [{ values: [cellData] }],
          fields: 'userEnteredValue,userEnteredFormat.textFormat.link',
          range: {
            sheetId,
            startRowIndex: rowIndex - 1,
            endRowIndex: rowIndex,
            startColumnIndex: TEXT_LINK_COL_INDEX,
            endColumnIndex: TEXT_LINK_COL_INDEX + 1,
          },
        },
      }],
    },
  });
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
