// app/(app)/written-products/[rowIndex]/page.tsx
export const dynamic = 'force-dynamic';

import 'server-only';
import { notFound } from 'next/navigation';
import { requireGoogleAccessToken } from '@/lib/google-session';
import { fetchAllWrittenProductRows } from '@/lib/written-products-sheets';
import { rowToWrittenProduct } from '@/lib/written-products-utils';
import { getEffectiveWrittenColumnMap } from '@/lib/written-column-mapping';
import { isSheetPermissionError } from '@/lib/sheet-errors';
import { WrittenProductDetailPage } from '@/components/written-products/written-product-detail-page';
import { SheetAccessDenied } from '@/components/sheet-access-denied';

export default async function WrittenProductPage({
  params,
}: {
  params: Promise<{ rowIndex: string }>;
}) {
  const { rowIndex: rowIndexStr } = await params;
  const rowIndex = parseInt(rowIndexStr, 10);
  if (isNaN(rowIndex) || rowIndex < 2) notFound();

  const [accessToken, colMap] = await Promise.all([
    requireGoogleAccessToken(),
    getEffectiveWrittenColumnMap(),
  ]);

  let rows: string[][];
  try {
    rows = await fetchAllWrittenProductRows(accessToken);
  } catch (err) {
    if (isSheetPermissionError(err)) return <SheetAccessDenied />;
    throw err;
  }

  const row = rows[rowIndex - 1];
  if (!row) notFound();

  return <WrittenProductDetailPage product={rowToWrittenProduct(row, rowIndex, undefined, colMap)} />;
}
