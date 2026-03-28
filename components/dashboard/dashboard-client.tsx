'use client';

import type { TourProduct } from '@/lib/types';
import { KpiCard } from './kpi-card';
import {
  ProductsByCountry,
  ProductsByType,
  ProductsByStatus,
  UploadProgress,
  PicWorkload,
  OtaCoverage,
} from './charts';

interface DashboardClientProps {
  products: TourProduct[];
}

export function DashboardClient({ products }: DashboardClientProps) {
  const total = products.length;
  const readyForUpload = products.filter((p) => p.readyForUpload === true).length;
  const uploaded = products.filter(
    (p) => p.uploadedPic && p.uploadedPic !== 'No' && p.uploadedPic.trim() !== '',
  ).length;
  const inProgress = products.filter((p) => p.productStatus === 'In Progress').length;
  const highPriority = products.filter(
    (p) => p.productStatus === 'In Progress - High priority',
  ).length;
  const completed = products.filter((p) => p.productStatus === 'Completed').length;
  const onHold = products.filter((p) => p.productStatus === 'On hold').length;

  return (
    <div className="p-6 space-y-8 max-w-screen-2xl mx-auto">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {total.toLocaleString()} products in total
        </p>
      </div>

      {/* KPI Cards */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          <KpiCard title="Total Products" value={total} color="default" />
          <KpiCard title="Ready for Upload" value={readyForUpload} total={total} color="green" />
          <KpiCard title="Uploaded" value={uploaded} total={total} color="green" />
          <KpiCard title="In Progress" value={inProgress} total={total} color="amber" />
          <KpiCard title="High Priority" value={highPriority} total={total} color="red" />
          <KpiCard title="Completed" value={completed} total={total} color="green" />
          <KpiCard title="On Hold" value={onHold} total={total} color="gray" />
        </div>
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProductsByCountry products={products} />
        <ProductsByType products={products} />
        <ProductsByStatus products={products} />
        <UploadProgress products={products} />
        <PicWorkload products={products} />
        <OtaCoverage products={products} />
      </section>
    </div>
  );
}
