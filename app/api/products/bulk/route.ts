import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { batchUpdateRows, deleteRow, fetchAllRows } from '@/lib/sheets';
import { getEffectiveColumnMap } from '@/lib/column-mapping';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
  try {
    const [colMap, body] = await Promise.all([
      getEffectiveColumnMap(),
      req.json() as Promise<{ rowIndexes: number[]; field: string; value: string }>,
    ]);

    const { rowIndexes, field, value } = body;

    if (!Array.isArray(rowIndexes) || rowIndexes.length === 0) {
      return NextResponse.json({ error: 'rowIndexes must be a non-empty array' }, { status: 400 });
    }
    if (!field || typeof value !== 'string') {
      return NextResponse.json({ error: 'field and value are required' }, { status: 400 });
    }

    const colIndex = colMap[field];
    if (colIndex === undefined) {
      return NextResponse.json({ error: `Unknown field: ${field}` }, { status: 400 });
    }

    if (rowIndexes.some((r) => r < 2)) {
      return NextResponse.json({ error: 'All rowIndexes must be >= 2' }, { status: 400 });
    }

    const allRows = await fetchAllRows();

    const updates = rowIndexes.map((rowIndex) => {
      const currentRow = [...(allRows[rowIndex - 1] ?? [])];
      while (currentRow.length < 70) currentRow.push('');
      currentRow[colIndex] = value;
      return { rowIndex, values: currentRow };
    });

    await batchUpdateRows(updates);

    return NextResponse.json({ ok: true, updated: rowIndexes.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json() as { rowIndexes: number[] };

    if (!Array.isArray(body.rowIndexes) || body.rowIndexes.length === 0) {
      return NextResponse.json({ error: 'rowIndexes must be a non-empty array' }, { status: 400 });
    }

    const sorted = [...body.rowIndexes].sort((a, b) => b - a);
    for (const rowIndex of sorted) {
      await deleteRow(rowIndex);
    }

    return NextResponse.json({ ok: true, deleted: sorted.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
