import { NextRequest, NextResponse } from 'next/server';
import { fetchAllRows, fetchColumnHyperlinks, appendRow, updateCellHyperlink } from '@/lib/sheets';
import { rowToProduct, productToRow, parseLinkField } from '@/lib/utils';
import type { TourProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';

const LINK_COL_INDEX = 5; // column F — "link" field

export async function GET() {
  try {
    const [rows, linkHyperlinks] = await Promise.all([
      fetchAllRows(),
      fetchColumnHyperlinks(LINK_COL_INDEX),
    ]);
    // Row 0 is the header — skip it. Data starts at row index 1 (array[1]).
    // Sheet rowIndex is 1-based: array[1] = sheet row 2 (first data row)
    const products: TourProduct[] = rows
      .slice(1) // skip header
      .map((row, i) => {
        const rowIndex = i + 2; // i=0 → sheet row 2
        return rowToProduct(row, rowIndex, linkHyperlinks.get(rowIndex));
      });
    return NextResponse.json(products);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Omit<TourProduct, 'rowIndex'>;
    const rowValues = productToRow(body);
    const newRowIndex = await appendRow(rowValues);

    // If link contains a URL, set the hyperlink on the newly appended row
    if (body.link) {
      const { text, url } = parseLinkField(body.link);
      if (url) {
        await updateCellHyperlink(newRowIndex, LINK_COL_INDEX, text, url);
      }
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
