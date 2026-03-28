export const dynamic = 'force-dynamic';

import { fetchAllRows } from '@/lib/sheets';
import { rowToProduct } from '@/lib/utils';
import { DashboardClient } from '@/components/dashboard/dashboard-client';

export default async function DashboardPage() {
  const rows = await fetchAllRows();
  const products = rows.slice(1).map((row, i) => rowToProduct(row, i + 2));
  return <DashboardClient products={products} />;
}
