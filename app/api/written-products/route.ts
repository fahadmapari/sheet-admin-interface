// app/api/written-products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleAccessTokenError, requireGoogleAccessToken } from '@/lib/google-session';
import { fetchAllWrittenProductRows, appendWrittenProductRow } from '@/lib/written-products-sheets';
import { rowToWrittenProduct, writtenProductToRow } from '@/lib/written-products-utils';
import type { WrittenProduct } from '@/lib/types';
import {
  getCachedWrittenProducts,
  setCachedWrittenProducts,
  invalidateWrittenProductsCache,
} from '@/lib/written-products-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cached = getCachedWrittenProducts();
    if (cached) return NextResponse.json(cached);

    const accessToken = await requireGoogleAccessToken();
    const rows = await fetchAllWrittenProductRows(accessToken);
    const products: WrittenProduct[] = rows
      .slice(1)
      .map((row, i) => rowToWrittenProduct(row, i + 2));
    setCachedWrittenProducts(products);
    return NextResponse.json(products);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err instanceof GoogleAccessTokenError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const accessToken = await requireGoogleAccessToken();
    const body = (await req.json()) as Omit<WrittenProduct, 'rowIndex'>;
    const values = writtenProductToRow(body);
    const newRowIndex = await appendWrittenProductRow(accessToken, values);
    invalidateWrittenProductsCache();
    return NextResponse.json(rowToWrittenProduct(values, newRowIndex), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err instanceof GoogleAccessTokenError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
