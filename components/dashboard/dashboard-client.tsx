'use client';

import {
  AlertTriangle,
  CheckCircle2,
  CircleGauge,
  Clock3,
  FileText,
  Package,
  Upload,
  Waypoints,
} from 'lucide-react';
import type { TourProduct } from '@/lib/types';
import type { WrittenProduct } from '@/lib/types';
import { KpiCard } from './kpi-card';
import {
  ProductsByCountry,
  ProductsByType,
  ProductsByStatus,
  UploadProgress,
} from './charts';
import {
  WrittenContentCompletion,
  WrittenChannelCoverage,
} from './written-products-charts';

interface DashboardClientProps {
  products: TourProduct[];
  writtenProducts: WrittenProduct[];
}

export function DashboardClient({ products, writtenProducts }: DashboardClientProps) {
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

  const wpTotal = writtenProducts.length;
  const wpContentExist = writtenProducts.filter((p) => p.contentExist).length;
  const wpB2b = writtenProducts.filter((p) => p.b2b).length;
  const wpB2c = writtenProducts.filter((p) => p.b2c).length;

  return (
    <div className="flex flex-col gap-8">
      {/* ── Products ─────────────────────────────────────────── */}
      <div>
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-sm font-medium text-[hsl(var(--text-secondary))] uppercase tracking-wider">
            Products
          </h2>
          <div className="flex-1 border-t border-[hsl(var(--border))]" />
          <span className="text-sm text-[hsl(var(--text-tertiary))]">
            {total.toLocaleString()} total
          </span>
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

        <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <ProductsByCountry products={products} />
          <ProductsByType products={products} />
          <ProductsByStatus products={products} />
          <UploadProgress products={products} />
        </section>
      </div>

      {/* ── Written Products ──────────────────────────────────── */}
      <div>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-sm font-medium text-[hsl(var(--text-secondary))] uppercase tracking-wider">
            Written Products
          </h2>
          <div className="flex-1 border-t border-[hsl(var(--border))]" />
          <span className="text-sm text-[hsl(var(--text-tertiary))]">
            {wpTotal.toLocaleString()} total
          </span>
        </div>

        <section>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Total Written"
              value={wpTotal}
              icon={<FileText className="h-4 w-4" />}
            />
            <KpiCard
              title="Content Exists"
              value={wpContentExist}
              total={wpTotal}
              tone="success"
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <KpiCard
              title="B2B"
              value={wpB2b}
              total={wpTotal}
              tone="info"
              icon={<Waypoints className="h-4 w-4" />}
            />
            <KpiCard
              title="B2C"
              value={wpB2c}
              total={wpTotal}
              tone="info"
              icon={<Waypoints className="h-4 w-4" />}
            />
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <WrittenContentCompletion writtenProducts={writtenProducts} />
          <WrittenChannelCoverage writtenProducts={writtenProducts} />
        </section>
      </div>
    </div>
  );
}
