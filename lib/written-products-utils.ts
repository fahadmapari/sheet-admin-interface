// lib/written-products-utils.ts
import type { WrittenProduct } from '@/lib/types';
import { parseLinkField } from '@/lib/utils';

function parseBoolean(v: string | undefined): boolean {
  return v?.toUpperCase() === 'TRUE';
}

export function rowToWrittenProduct(
  row: string[],
  rowIndex: number,
  textLinkUrl: string | undefined,
  colMap: Record<string, number>,
): WrittenProduct {
  const textLinkRaw = row[colMap.textLink] ?? '';
  const textLink = textLinkUrl ? `${textLinkRaw}||${textLinkUrl}` : textLinkRaw;
  return {
    rowIndex,
    country: row[colMap.country] ?? '',
    cityDestination: row[colMap.cityDestination] ?? '',
    state: row[colMap.state] ?? '',
    tourType: row[colMap.tourType] ?? '',
    textLink,
    ccOk: parseBoolean(row[colMap.ccOk]),
    isOk: parseBoolean(row[colMap.isOk]),
    rrOk: parseBoolean(row[colMap.rrOk]),
    ssOk: parseBoolean(row[colMap.ssOk]),
    contentExist: parseBoolean(row[colMap.contentExist]),
    b2b: parseBoolean(row[colMap.b2b]),
    b2c: parseBoolean(row[colMap.b2c]),
    ssNotes: parseBoolean(row[colMap.ssNotes]),
  };
}

export function writtenProductToRow(
  product: Omit<WrittenProduct, 'rowIndex'>,
  colMap: Record<string, number>,
): string[] {
  const { text, url } = parseLinkField(product.textLink || '');
  const textLinkDisplayText = text || url || product.textLink;

  const maxIdx = Math.max(...Object.values(colMap));
  const row: string[] = new Array(maxIdx + 1).fill('');

  row[colMap.country] = product.country;
  row[colMap.cityDestination] = product.cityDestination;
  row[colMap.state] = product.state;
  row[colMap.tourType] = product.tourType;
  row[colMap.textLink] = textLinkDisplayText;
  row[colMap.ccOk] = product.ccOk ? 'TRUE' : 'FALSE';
  row[colMap.isOk] = product.isOk ? 'TRUE' : 'FALSE';
  row[colMap.rrOk] = product.rrOk ? 'TRUE' : 'FALSE';
  row[colMap.ssOk] = product.ssOk ? 'TRUE' : 'FALSE';
  row[colMap.contentExist] = product.contentExist ? 'TRUE' : 'FALSE';
  row[colMap.b2b] = product.b2b ? 'TRUE' : 'FALSE';
  row[colMap.b2c] = product.b2c ? 'TRUE' : 'FALSE';
  row[colMap.ssNotes] = product.ssNotes ? 'TRUE' : 'FALSE';

  return row;
}
