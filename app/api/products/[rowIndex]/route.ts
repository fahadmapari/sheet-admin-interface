import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { updateRow, updateCell, updateCellHyperlink, deleteRow, findRowByProductName, fetchRow } from '@/lib/sheets';
import { GoogleAccessTokenError, requireGoogleAccessToken } from '@/lib/google-session';
import { productToRow, parseLinkField } from '@/lib/utils';
import { getEffectiveColumnMap } from '@/lib/column-mapping';
import type { TourProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ rowIndex: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { rowIndex: rowIndexStr } = await params;
  const rowIndex = parseInt(rowIndexStr, 10);
  if (isNaN(rowIndex) || rowIndex < 2) {
    return NextResponse.json({ error: 'Invalid rowIndex' }, { status: 400 });
  }
  try {
    const accessToken = await requireGoogleAccessToken();
    const sheetsAuth = { auth: 'user' as const, accessToken };
    const [colMap, body] = await Promise.all([
      getEffectiveColumnMap(),
      req.json() as Promise<Omit<TourProduct, 'rowIndex'>>,
    ]);

    const linkTitle = parseLinkField(body.link ?? '').text;
    let targetRowIndex = rowIndex;
    if (linkTitle) {
      const foundRow = await findRowByProductName(sheetsAuth, linkTitle);
      if (foundRow === null) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      targetRowIndex = foundRow;
    }

    const currentRow = await fetchRow(sheetsAuth, targetRowIndex);
    while (currentRow.length < 70) currentRow.push('');

    const submittedRow = productToRow(body, colMap);
    const mergedRow = currentRow.map((currentVal, i) => {
      const submitted = submittedRow[i] ?? '';
      return submitted !== '' ? submitted : currentVal;
    });

    await updateRow(sheetsAuth, targetRowIndex, mergedRow);

    const { text: linkText, url: linkUrl } = parseLinkField(body.link ?? '');
    if (linkUrl || linkText) {
      await updateCellHyperlink(sheetsAuth, targetRowIndex, colMap['link'], linkText, linkUrl);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err instanceof GoogleAccessTokenError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { rowIndex: rowIndexStr } = await params;
  const rowIndex = parseInt(rowIndexStr, 10);
  if (isNaN(rowIndex) || rowIndex < 2) {
    return NextResponse.json({ error: 'Invalid rowIndex' }, { status: 400 });
  }
  try {
    const accessToken = await requireGoogleAccessToken();
    const sheetsAuth = { auth: 'user' as const, accessToken };
    const [colMap, body] = await Promise.all([
      getEffectiveColumnMap(),
      req.json() as Promise<{ field: string; value: string; expectedLinkTitle?: string }>,
    ]);

    const colIndex = colMap[body.field];
    if (colIndex === undefined) {
      return NextResponse.json({ error: `Unknown field: ${body.field}` }, { status: 400 });
    }

    let targetRowIndex = rowIndex;
    if (body.field !== 'link' && body.expectedLinkTitle) {
      const foundRow = await findRowByProductName(sheetsAuth, body.expectedLinkTitle);
      if (foundRow === null) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      targetRowIndex = foundRow;
    }

    if (body.field === 'link') {
      const { text, url } = parseLinkField(body.value ?? '');
      await updateCellHyperlink(sheetsAuth, targetRowIndex, colIndex, text, url);
    } else {
      await updateCell(sheetsAuth, targetRowIndex, colIndex, body.value);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err instanceof GoogleAccessTokenError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { rowIndex: rowIndexStr } = await params;
  const rowIndex = parseInt(rowIndexStr, 10);
  if (isNaN(rowIndex) || rowIndex < 2) {
    return NextResponse.json({ error: 'Invalid rowIndex' }, { status: 400 });
  }
  try {
    const accessToken = await requireGoogleAccessToken();
    await deleteRow({ auth: 'user', accessToken }, rowIndex);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err instanceof GoogleAccessTokenError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
