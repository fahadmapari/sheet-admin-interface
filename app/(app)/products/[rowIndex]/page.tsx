export const dynamic = 'force-dynamic';

import 'server-only';
import { fetchAllRows } from '@/lib/sheets';
import { requireGoogleAccessToken } from '@/lib/google-session';
import { rowToProduct } from '@/lib/utils';
import { ProductDetailClient } from '@/components/products/product-detail-tabs';
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
  const rows = await fetchAllRows({ auth: 'user', accessToken });
  const row = rows[rowIndex - 1]; // 1-based → 0-based array index
  if (!row) notFound();
  const product = rowToProduct(row, rowIndex);

  return <ProductDetailClient product={product} />;
}
