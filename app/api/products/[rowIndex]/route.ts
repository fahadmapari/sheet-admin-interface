import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { updateRow, updateCell, updateCellHyperlink, deleteRow, findRowByProductName, fetchRow } from '@/lib/sheets';
import { productToRow, parseLinkField } from '@/lib/utils';
import { FIELD_TO_COL } from '@/lib/constants';
import type { TourProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Params = { params: { rowIndex: string } };

export async function PUT(req: NextRequest, { params }: Params) {
  const rowIndex = parseInt(params.rowIndex, 10);
  if (isNaN(rowIndex) || rowIndex < 2) {
    return NextResponse.json({ error: 'Invalid rowIndex' }, { status: 400 });
  }
  try {
    const body = await req.json() as Omit<TourProduct, 'rowIndex'>;

    // Resolve real row index using the link title as the identity anchor
    const linkTitle = parseLinkField(body.link ?? '').text;
    let targetRowIndex = rowIndex;
    if (linkTitle) {
      const foundRow = await findRowByProductName(linkTitle);
      if (foundRow === null) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      targetRowIndex = foundRow;
    }

    // Fetch the current row so we don't blank out fields not covered by this form save
    const currentRow = await fetchRow(targetRowIndex);
    while (currentRow.length < 70) currentRow.push('');

    // Build the row from submitted body, then merge: prefer submitted non-empty values,
    // keep current sheet value for any field the form left blank
    const submittedRow = productToRow(body);
    const mergedRow = currentRow.map((currentVal, i) => {
      const submitted = submittedRow[i] ?? '';
      return submitted !== '' ? submitted : currentVal;
    });

    await updateRow(targetRowIndex, mergedRow);
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
    const body = await req.json() as { field: string; value: string; expectedLinkTitle?: string };
    const colIndex = FIELD_TO_COL[body.field as keyof typeof FIELD_TO_COL];
    if (colIndex === undefined) {
      return NextResponse.json({ error: `Unknown field: ${body.field}` }, { status: 400 });
    }

    // Resolve real row index unless the link field itself is being changed
    // (when editing the link, the title is changing so we can't use it for identity)
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
