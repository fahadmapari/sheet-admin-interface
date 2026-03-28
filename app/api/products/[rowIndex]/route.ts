import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { updateRow, updateCell, deleteRow } from '@/lib/sheets';
import { productToRow } from '@/lib/utils';
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
    const rowValues = productToRow(body);
    await updateRow(rowIndex, rowValues);
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
    const body = await req.json() as { field: string; value: string };
    const colIndex = FIELD_TO_COL[body.field as keyof typeof FIELD_TO_COL];
    if (colIndex === undefined) {
      return NextResponse.json({ error: `Unknown field: ${body.field}` }, { status: 400 });
    }
    await updateCell(rowIndex, colIndex, body.value);
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
