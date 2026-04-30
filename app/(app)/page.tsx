export const dynamic = 'force-dynamic';

import { fetchAllRows } from '@/lib/sheets';
import { requireGoogleAccessToken } from '@/lib/google-session';
import { rowToProduct } from '@/lib/utils';
import { fetchAllWrittenProductRows } from '@/lib/written-products-sheets';
import { rowToWrittenProduct } from '@/lib/written-products-utils';
import { getEffectiveWrittenColumnMap } from '@/lib/written-column-mapping';
import { isSheetPermissionError } from '@/lib/sheet-errors';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { SheetAccessDenied } from '@/components/sheet-access-denied';

export default async function DashboardPage() {
  const accessToken = await requireGoogleAccessToken();

  try {
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
  } catch (err) {
    if (isSheetPermissionError(err)) return <SheetAccessDenied />;
    throw err;
  }
}
