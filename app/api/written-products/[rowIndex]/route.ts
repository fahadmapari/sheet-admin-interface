// app/api/written-products/[rowIndex]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleAccessTokenError, requireGoogleAccessToken } from '@/lib/google-session';
import {
  fetchAllWrittenProductRows,
  updateWrittenProductRow,
  updateTextLinkHyperlink,
  deleteWrittenProductRow,
} from '@/lib/written-products-sheets';
import { rowToWrittenProduct, writtenProductToRow } from '@/lib/written-products-utils';
import { parseLinkField } from '@/lib/utils';
import type { WrittenProduct } from '@/lib/types';
import { invalidateWrittenProductsCache } from '@/lib/written-products-cache';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ rowIndex: string }> };

function parseRowIndex(str: string): number | null {
  const n = parseInt(str, 10);
  return isNaN(n) || n < 2 ? null : n;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { rowIndex: rowIndexStr } = await params;
    const rowIndex = parseRowIndex(rowIndexStr);
    if (rowIndex === null) return NextResponse.json({ error: 'Invalid row index' }, { status: 400 });

    const accessToken = await requireGoogleAccessToken();
    const rows = await fetchAllWrittenProductRows(accessToken);
    const row = rows[rowIndex - 1];
    if (!row) return NextResponse.json({ error: 'Row not found' }, { status: 404 });
    return NextResponse.json(rowToWrittenProduct(row, rowIndex));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err instanceof GoogleAccessTokenError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { rowIndex: rowIndexStr } = await params;
    const rowIndex = parseRowIndex(rowIndexStr);
    if (rowIndex === null) return NextResponse.json({ error: 'Invalid row index' }, { status: 400 });

    const accessToken = await requireGoogleAccessToken();
    const body = (await req.json()) as Omit<WrittenProduct, 'rowIndex'>;
    const values = writtenProductToRow(body);
    const { text, url } = parseLinkField(body.textLink || '');
    await updateWrittenProductRow(accessToken, rowIndex, values);
    if (url) {
      await updateTextLinkHyperlink(accessToken, rowIndex, text || url, url);
    }
    invalidateWrittenProductsCache();
    return NextResponse.json({ ...body, rowIndex });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err instanceof GoogleAccessTokenError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { rowIndex: rowIndexStr } = await params;
    const rowIndex = parseRowIndex(rowIndexStr);
    if (rowIndex === null) return NextResponse.json({ error: 'Invalid row index' }, { status: 400 });

    const accessToken = await requireGoogleAccessToken();
    await deleteWrittenProductRow(accessToken, rowIndex);
    invalidateWrittenProductsCache();
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err instanceof GoogleAccessTokenError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
