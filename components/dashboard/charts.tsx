'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { TourProduct } from '@/lib/types';

const CHART_COLORS = [
  'hsl(var(--text-primary))',
  'hsl(var(--accent))',
  'hsl(var(--text-secondary))',
  'hsl(var(--text-tertiary))',
  'hsl(var(--border-strong))',
  'hsl(var(--surface-raised))',
];

const AXIS_TICK = { fontSize: 11, fill: 'hsl(var(--text-tertiary))' };
const GRID_STROKE = 'hsl(var(--border))';
const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--background))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: 12,
  color: 'hsl(var(--text-primary))',
};
const CURSOR_STYLE = { fill: 'hsl(var(--surface))' };

// ─── Chart 1: Products by Country ───────────────────────────────────────────
interface CountItem { country: string; count: number }

export function ProductsByCountry({ products }: { products: TourProduct[] }) {
  const countMap: Record<string, number> = {};
  for (const p of products) {
    if (p.country) countMap[p.country] = (countMap[p.country] ?? 0) + 1;
  }
  const data: CountItem[] = Object.entries(countMap)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Products by Country</CardTitle>
        <CardDescription>Top destinations by product count</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20, top: 4, bottom: 4 }}>
            <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
            <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="country"
              width={75}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={CURSOR_STYLE} />
            <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Chart 2: Products by Type (Donut) ──────────────────────────────────────
export function ProductsByType({ products }: { products: TourProduct[] }) {
  const countMap: Record<string, number> = {};
  for (const p of products) {
    const t = p.productType || 'Unknown';
    countMap[t] = (countMap[t] ?? 0) + 1;
  }
  const sorted = Object.entries(countMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const top10 = sorted.slice(0, 10);
  const otherCount = sorted.slice(10).reduce((sum, item) => sum + item.value, 0);
  const data = otherCount > 0 ? [...top10, { name: 'Other', value: otherCount }] : top10;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Products by Type</CardTitle>
        <CardDescription>Distribution across the most common product types</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={100}
              dataKey="value"
              nameKey="name"
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8, color: 'hsl(var(--text-secondary))' }}
              iconSize={10}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Chart 3: Products by Status ────────────────────────────────────────────
export function ProductsByStatus({ products }: { products: TourProduct[] }) {
  const countMap: Record<string, number> = {};
  for (const p of products) {
    const s = p.productStatus || 'Unknown';
    countMap[s] = (countMap[s] ?? 0) + 1;
  }
  const data = Object.entries(countMap)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Products by Status</CardTitle>
        <CardDescription>Current workflow distribution</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ left: 140, right: 20, top: 4, bottom: 4 }}>
            <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
            <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="status"
              width={135}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={CURSOR_STYLE} />
            <Bar dataKey="count" radius={[0, 3, 3, 0]}>
              {data.map((_, idx) => (
                <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Chart 4: Upload Progress ────────────────────────────────────────────────
export function UploadProgress({ products }: { products: TourProduct[] }) {
  const readyCount = products.filter((p) => p.readyForUpload).length;
  const uploadedCount = products.filter(
    (p) => p.uploadedPic && p.uploadedPic !== 'No' && p.uploadedPic.trim() !== '',
  ).length;
  const total = products.length;
  const readyPct = total > 0 ? Math.round((readyCount / total) * 100) : 0;
  const uploadedPct = readyCount > 0 ? Math.round((uploadedCount / readyCount) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Progress</CardTitle>
        <CardDescription>Readiness and completion across the catalog</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-[hsl(var(--text-secondary))]">Ready for Upload</span>
            <span className="font-medium text-[hsl(var(--text-primary))]">
              {readyCount.toLocaleString()} / {total.toLocaleString()} ({readyPct}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--surface-raised))]">
            <div
              className="h-full rounded-full bg-[hsl(var(--text-primary))] transition-all"
              style={{ width: `${readyPct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-[hsl(var(--text-secondary))]">Uploaded (of ready)</span>
            <span className="font-medium text-[hsl(var(--text-primary))]">
              {uploadedCount.toLocaleString()} / {readyCount.toLocaleString()} ({uploadedPct}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--surface-raised))]">
            <div
              className="h-full rounded-full bg-[hsl(var(--accent))] transition-all"
              style={{ width: `${uploadedPct}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Chart 5: PIC Workload ───────────────────────────────────────────────────
export function PicWorkload({ products }: { products: TourProduct[] }) {
  const countMap: Record<string, number> = {};
  for (const p of products) {
    const pic = p.pic || 'Unassigned';
    countMap[pic] = (countMap[pic] ?? 0) + 1;
  }
  const data = Object.entries(countMap)
    .map(([pic, count]) => ({ pic, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <Card>
      <CardHeader>
        <CardTitle>PIC Workload</CardTitle>
        <CardDescription>Assigned products by PIC</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ left: 70, right: 20, top: 4, bottom: 4 }}>
            <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
            <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="pic"
              width={65}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={CURSOR_STYLE} />
            <Bar dataKey="count" fill="hsl(var(--text-primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Chart 6: OTA Coverage ───────────────────────────────────────────────────
const OTA_CHANNELS: { key: keyof TourProduct; label: string }[] = [
  { key: 'otaTravmonde', label: 'Travmonde' },
  { key: 'otaBookableTours', label: 'Bookable Tours' },
  { key: 'otaViator', label: 'Viator' },
  { key: 'otaGyg', label: 'GYG' },
  { key: 'otaHotelbeds', label: 'Hotelbeds' },
  { key: 'otaProjectExpedition', label: 'Project Expedition' },
  { key: 'otaAirbnb', label: 'Airbnb' },
  { key: 'otaBokun', label: 'Bokun' },
  { key: 'otaTrekksoft', label: 'Trekksoft' },
  { key: 'otaTuiMusement', label: 'TUI/Musement' },
  { key: 'otaKlook', label: 'Klook' },
  { key: 'otaToristy', label: 'Toristy' },
  { key: 'otaTourHQ', label: 'TourHQ' },
];

function isOtaActive(value: unknown): boolean {
  if (!value) return false;
  const s = String(value).trim();
  return s !== '' && s !== 'No' && s !== '0';
}

export function OtaCoverage({ products }: { products: TourProduct[] }) {
  const data = OTA_CHANNELS.map(({ key, label }) => ({
    channel: label,
    count: products.filter((p) => isOtaActive(p[key])).length,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>OTA Coverage</CardTitle>
        <CardDescription>Active channel coverage across OTAs</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} layout="vertical" margin={{ left: 110, right: 20, top: 4, bottom: 4 }}>
            <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
            <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="channel"
              width={105}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={CURSOR_STYLE} />
            <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
