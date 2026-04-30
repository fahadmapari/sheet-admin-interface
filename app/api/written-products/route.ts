// app/api/written-products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import { requireGoogleAccessToken } from '@/lib/google-session';
import { fetchAllWrittenProductRows, fetchTextLinkHyperlinks, appendWrittenProductRow, updateTextLinkHyperlink } from '@/lib/written-products-sheets';
import { rowToWrittenProduct, writtenProductToRow } from '@/lib/written-products-utils';
import { parseLinkField } from '@/lib/utils';
import type { WrittenProduct } from '@/lib/types';
import {
  getCachedWrittenProducts,
  setCachedWrittenProducts,
  invalidateWrittenProductsCache,
} from '@/lib/written-products-cache';
import { getEffectiveWrittenColumnMap } from '@/lib/written-column-mapping';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cached = getCachedWrittenProducts();
    if (cached) return NextResponse.json(cached);

    const [accessToken, colMap] = await Promise.all([
      requireGoogleAccessToken(),
      getEffectiveWrittenColumnMap(),
    ]);
    const [rows, textLinkUrls] = await Promise.all([
      fetchAllWrittenProductRows(accessToken),
      fetchTextLinkHyperlinks(accessToken),
    ]);
    const products: WrittenProduct[] = rows
      .slice(1)
      .map((row, i) => rowToWrittenProduct(row, i + 2, textLinkUrls.get(i + 2), colMap));
    setCachedWrittenProducts(products);
    return NextResponse.json(products);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const [accessToken, colMap] = await Promise.all([
      requireGoogleAccessToken(),
      getEffectiveWrittenColumnMap(),
    ]);
    const body = (await req.json()) as Omit<WrittenProduct, 'rowIndex'>;
    const values = writtenProductToRow(body, colMap);
    const newRowIndex = await appendWrittenProductRow(accessToken, values);
    const { text, url } = parseLinkField(body.textLink || '');
    if (url) {
      await updateTextLinkHyperlink(accessToken, newRowIndex, text || url, url);
    }
    invalidateWrittenProductsCache();
    return NextResponse.json({ ...body, rowIndex: newRowIndex }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
