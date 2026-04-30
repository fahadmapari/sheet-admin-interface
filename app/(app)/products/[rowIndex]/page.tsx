export const dynamic = 'force-dynamic';

import 'server-only';
import { fetchAllRows } from '@/lib/sheets';
import { requireGoogleAccessToken } from '@/lib/google-session';
import { rowToProduct } from '@/lib/utils';
import { isSheetPermissionError } from '@/lib/sheet-errors';
import { ProductDetailClient } from '@/components/products/product-detail-tabs';
import { SheetAccessDenied } from '@/components/sheet-access-denied';
import { notFound } from 'next/navigation';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ rowIndex: string }>;
}) {
  const { rowIndex: rowIndexStr } = await params;
  const rowIndex = parseInt(rowIndexStr, 10);
  if (isNaN(rowIndex) || rowIndex < 2) notFound();

  const accessToken = await requireGoogleAccessToken();

  let rows: string[][];
  try {
    rows = await fetchAllRows({ auth: 'user', accessToken });
  } catch (err) {
    if (isSheetPermissionError(err)) return <SheetAccessDenied />;
    throw err;
  }

  const row = rows[rowIndex - 1];
  if (!row) notFound();
  const product = rowToProduct(row, rowIndex);

  return <ProductDetailClient product={product} />;
}
