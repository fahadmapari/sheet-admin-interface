// app/(app)/written-products/[rowIndex]/page.tsx
export const dynamic = 'force-dynamic';

import 'server-only';
import { notFound } from 'next/navigation';
import { requireGoogleAccessToken } from '@/lib/google-session';
import { fetchAllWrittenProductRows } from '@/lib/written-products-sheets';
import { rowToWrittenProduct } from '@/lib/written-products-utils';
import { getEffectiveWrittenColumnMap } from '@/lib/written-column-mapping';
import { WrittenProductDetailPage } from '@/components/written-products/written-product-detail-page';

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
  const rows = await fetchAllWrittenProductRows(accessToken);
  const row = rows[rowIndex - 1];
  if (!row) notFound();

  return <WrittenProductDetailPage product={rowToWrittenProduct(row, rowIndex, undefined, colMap)} />;
}
