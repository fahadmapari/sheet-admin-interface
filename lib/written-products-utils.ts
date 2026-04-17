// lib/written-products-utils.ts
import type { WrittenProduct } from '@/lib/types';

function parseBoolean(v: string | undefined): boolean {
  return v?.toUpperCase() === 'TRUE';
}

export function rowToWrittenProduct(row: string[], rowIndex: number): WrittenProduct {
  return {
    rowIndex,
    country: row[0] ?? '',
    cityDestination: row[1] ?? '',
    state: row[2] ?? '',
    tourType: row[3] ?? '',
    textLink: row[4] ?? '',
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
  return [
    product.country,
    product.cityDestination,
    product.state,
    product.tourType,
    product.textLink,
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
