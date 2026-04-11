import { NextRequest, NextResponse } from 'next/server';
import { fetchAllRows, fetchColumnHyperlinks, fetchColumnRichTextLinks, appendRow, updateCellHyperlink } from '@/lib/sheets';
import { rowToProduct, productToRow, parseLinkField } from '@/lib/utils';
import { getEffectiveColumnMap } from '@/lib/column-mapping';
import type { TourProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [colMap, rows] = await Promise.all([
      getEffectiveColumnMap(),
      fetchAllRows(),
    ]);

    const linkColIndex = colMap['link'];
    const imageLinksColIndex = colMap['imageLinks'];

    const [linkHyperlinks, imageLinksRichText] = await Promise.all([
      fetchColumnHyperlinks(linkColIndex),
      fetchColumnRichTextLinks(imageLinksColIndex),
    ]);

    const products: TourProduct[] = rows
      .slice(1)
      .map((row, i) => {
        const rowIndex = i + 2;
        return rowToProduct(
          row,
          rowIndex,
          linkHyperlinks.get(rowIndex),
          imageLinksRichText.get(rowIndex),
          colMap,
        );
      });

    return NextResponse.json(products);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const [colMap, body] = await Promise.all([
      getEffectiveColumnMap(),
      req.json() as Promise<Omit<TourProduct, 'rowIndex'>>,
    ]);

    const rowValues = productToRow(body, colMap);
    const newRowIndex = await appendRow(rowValues);

    if (body.link) {
      const { text, url } = parseLinkField(body.link);
      if (url) {
        await updateCellHyperlink(newRowIndex, colMap['link'], text, url);
      }
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
