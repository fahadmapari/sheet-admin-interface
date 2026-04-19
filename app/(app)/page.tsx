export const dynamic = 'force-dynamic';

import { fetchAllRows } from '@/lib/sheets';
import { requireGoogleAccessToken } from '@/lib/google-session';
import { rowToProduct } from '@/lib/utils';
import { fetchAllWrittenProductRows } from '@/lib/written-products-sheets';
import { rowToWrittenProduct } from '@/lib/written-products-utils';
import { getEffectiveWrittenColumnMap } from '@/lib/written-column-mapping';
import { DashboardClient } from '@/components/dashboard/dashboard-client';

export default async function DashboardPage() {
  const accessToken = await requireGoogleAccessToken();

  const [rows, writtenRows, colMap] = await Promise.all([
    fetchAllRows({ auth: 'user', accessToken }),
    fetchAllWrittenProductRows(accessToken),
    getEffectiveWrittenColumnMap(),
  ]);

  const products = rows.slice(1).map((row, i) => rowToProduct(row, i + 2));
  const writtenProducts = writtenRows
    .slice(1)
    .map((row, i) => rowToWrittenProduct(row, i + 2, undefined, colMap));

  return <DashboardClient products={products} writtenProducts={writtenProducts} />;
}
