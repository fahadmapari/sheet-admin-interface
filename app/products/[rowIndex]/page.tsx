export const dynamic = 'force-dynamic';

import 'server-only';
import { fetchAllRows } from '@/lib/sheets';
import { rowToProduct } from '@/lib/utils';
import { ProductDetailClient } from '@/components/products/product-detail-tabs';
import { notFound } from 'next/navigation';

export default async function ProductDetailPage({
  params,
}: {
  params: { rowIndex: string };
}) {
  const rowIndex = parseInt(params.rowIndex, 10);
  if (isNaN(rowIndex) || rowIndex < 2) notFound();

  const rows = await fetchAllRows();
  const row = rows[rowIndex - 1]; // 1-based → 0-based array index
  if (!row) notFound();
  const product = rowToProduct(row, rowIndex);

  return <ProductDetailClient product={product} />;
}
