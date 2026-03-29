'use client';

import {
  AlertTriangle,
  CheckCircle2,
  CircleGauge,
  Clock3,
  Package,
  Upload,
  Waypoints,
} from 'lucide-react';
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-[hsl(var(--text-secondary))]">
          {total.toLocaleString()} products in total
        </p>
      </div>

      <section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          <KpiCard title="Total Products" value={total} icon={<Package className="h-4 w-4" />} />
          <KpiCard
            title="Ready for Upload"
            value={readyForUpload}
            total={total}
            tone="success"
            icon={<Upload className="h-4 w-4" />}
          />
          <KpiCard
            title="Uploaded"
            value={uploaded}
            total={total}
            tone="info"
            icon={<Waypoints className="h-4 w-4" />}
          />
          <KpiCard
            title="In Progress"
            value={inProgress}
            total={total}
            tone="warning"
            icon={<Clock3 className="h-4 w-4" />}
          />
          <KpiCard
            title="High Priority"
            value={highPriority}
            total={total}
            tone="error"
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          <KpiCard
            title="Completed"
            value={completed}
            total={total}
            tone="success"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <KpiCard
            title="On Hold"
            value={onHold}
            total={total}
            icon={<CircleGauge className="h-4 w-4" />}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
