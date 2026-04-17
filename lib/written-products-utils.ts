// lib/written-products-utils.ts
import type { WrittenProduct } from '@/lib/types';
import { parseLinkField } from '@/lib/utils';

function parseBoolean(v: string | undefined): boolean {
  return v?.toUpperCase() === 'TRUE';
}

export function rowToWrittenProduct(row: string[], rowIndex: number, textLinkUrl?: string): WrittenProduct {
  const textLinkRaw = row[4] ?? '';
  const textLink = textLinkUrl ? `${textLinkRaw}||${textLinkUrl}` : textLinkRaw;
  return {
    rowIndex,
    country: row[0] ?? '',
    cityDestination: row[1] ?? '',
    state: row[2] ?? '',
    tourType: row[3] ?? '',
    textLink,
    ccOk: parseBoolean(row[5]),
    isOk: parseBoolean(row[6]),
    rrOk: parseBoolean(row[7]),
    ssOk: parseBoolean(row[8]),
    contentExist: parseBoolean(row[9]),
    b2b: parseBoolean(row[10]),
    b2c: parseBoolean(row[11]),
    ssNotes: parseBoolean(row[12]),
  };
}

export function writtenProductToRow(product: Omit<WrittenProduct, 'rowIndex'>): string[] {
  const { text, url } = parseLinkField(product.textLink || '');
  const textLinkDisplayText = text || url || product.textLink;
  return [
    product.country,
    product.cityDestination,
    product.state,
    product.tourType,
    textLinkDisplayText,
    product.ccOk ? 'TRUE' : 'FALSE',
    product.isOk ? 'TRUE' : 'FALSE',
    product.rrOk ? 'TRUE' : 'FALSE',
    product.ssOk ? 'TRUE' : 'FALSE',
    product.contentExist ? 'TRUE' : 'FALSE',
    product.b2b ? 'TRUE' : 'FALSE',
    product.b2c ? 'TRUE' : 'FALSE',
    product.ssNotes ? 'TRUE' : 'FALSE',
  ];
}
