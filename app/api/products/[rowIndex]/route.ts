import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { updateRow, updateCell, updateCellHyperlink, deleteRow, findRowByProductName, fetchRow } from '@/lib/sheets';
import { productToRow, parseLinkField } from '@/lib/utils';
import { getEffectiveColumnMap } from '@/lib/column-mapping';
import type { TourProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Params = { params: { rowIndex: string } };

export async function PUT(req: NextRequest, { params }: Params) {
  const rowIndex = parseInt(params.rowIndex, 10);
  if (isNaN(rowIndex) || rowIndex < 2) {
    return NextResponse.json({ error: 'Invalid rowIndex' }, { status: 400 });
  }
  try {
    const [colMap, body] = await Promise.all([
      getEffectiveColumnMap(),
      req.json() as Promise<Omit<TourProduct, 'rowIndex'>>,
    ]);

    const linkTitle = parseLinkField(body.link ?? '').text;
    let targetRowIndex = rowIndex;
    if (linkTitle) {
      const foundRow = await findRowByProductName(linkTitle);
      if (foundRow === null) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      targetRowIndex = foundRow;
    }

    const currentRow = await fetchRow(targetRowIndex);
    while (currentRow.length < 70) currentRow.push('');

    const submittedRow = productToRow(body, colMap);
    const mergedRow = currentRow.map((currentVal, i) => {
      const submitted = submittedRow[i] ?? '';
      return submitted !== '' ? submitted : currentVal;
    });

    await updateRow(targetRowIndex, mergedRow);

    const { text: linkText, url: linkUrl } = parseLinkField(body.link ?? '');
    if (linkUrl || linkText) {
      await updateCellHyperlink(targetRowIndex, colMap['link'], linkText, linkUrl);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const rowIndex = parseInt(params.rowIndex, 10);
  if (isNaN(rowIndex) || rowIndex < 2) {
    return NextResponse.json({ error: 'Invalid rowIndex' }, { status: 400 });
  }
  try {
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
      const foundRow = await findRowByProductName(body.expectedLinkTitle);
      if (foundRow === null) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      targetRowIndex = foundRow;
    }

    if (body.field === 'link') {
      const { text, url } = parseLinkField(body.value ?? '');
      await updateCellHyperlink(targetRowIndex, colIndex, text, url);
    } else {
      await updateCell(targetRowIndex, colIndex, body.value);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const rowIndex = parseInt(params.rowIndex, 10);
  if (isNaN(rowIndex) || rowIndex < 2) {
    return NextResponse.json({ error: 'Invalid rowIndex' }, { status: 400 });
  }
  try {
    await deleteRow(rowIndex);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
