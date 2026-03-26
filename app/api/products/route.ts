import { NextResponse } from 'next/server';
import { fetchAllRows } from '@/lib/sheets';
import { rowToProduct } from '@/lib/utils';
import type { TourProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await fetchAllRows();
    // Row 0 is the header — skip it. Data starts at row index 1 (array[1]).
    // Sheet rowIndex is 1-based: array[1] = sheet row 2 (first data row)
    const products: TourProduct[] = rows
      .slice(1) // skip header
      .map((row, i) => rowToProduct(row, i + 2)); // i=0 → sheet row 2
    return NextResponse.json(products);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
