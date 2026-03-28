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
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TourProduct } from '@/lib/types';

// Status hex colors (recharts SVG can't use Tailwind classes)
const STATUS_HEX: Record<string, { fill: string; stroke: string }> = {
  'In Progress': { fill: '#fef3c7', stroke: '#d97706' },
  Completed: { fill: '#dcfce7', stroke: '#16a34a' },
  'In Progress - High priority': { fill: '#fee2e2', stroke: '#dc2626' },
  'On hold': { fill: '#f3f4f6', stroke: '#6b7280' },
  Ignored: { fill: '#f9fafb', stroke: '#9ca3af' },
};

const PIE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#3b82f6',
  '#a855f7',
];

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
        <CardTitle className="text-base">Products by Country</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20, top: 4, bottom: 4 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis
              type="category"
              dataKey="country"
              width={75}
              tick={{ fontSize: 11, fill: '#6b7280' }}
            />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              cursor={{ fill: '#f3f4f6' }}
            />
            <Bar dataKey="count" fill="#6366f1" radius={[0, 3, 3, 0]} />
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
        <CardTitle className="text-base">Products by Type</CardTitle>
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
                <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
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
        <CardTitle className="text-base">Products by Status</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ left: 140, right: 20, top: 4, bottom: 4 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis
              type="category"
              dataKey="status"
              width={135}
              tick={{ fontSize: 11, fill: '#6b7280' }}
            />
            <Tooltip contentStyle={{ fontSize: 12 }} cursor={{ fill: '#f3f4f6' }} />
            <Bar dataKey="count" radius={[0, 3, 3, 0]}>
              {data.map((entry, idx) => {
                const colors = STATUS_HEX[entry.status] ?? { fill: '#e5e7eb', stroke: '#9ca3af' };
                return <Cell key={idx} fill={colors.fill} stroke={colors.stroke} strokeWidth={1} />;
              })}
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
        <CardTitle className="text-base">Upload Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Ready for Upload</span>
            <span className="font-medium">
              {readyCount.toLocaleString()} / {total.toLocaleString()} ({readyPct}%)
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${readyPct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Uploaded (of ready)</span>
            <span className="font-medium">
              {uploadedCount.toLocaleString()} / {readyCount.toLocaleString()} ({uploadedPct}%)
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
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
        <CardTitle className="text-base">PIC Workload</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ left: 70, right: 20, top: 4, bottom: 4 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis
              type="category"
              dataKey="pic"
              width={65}
              tick={{ fontSize: 11, fill: '#6b7280' }}
            />
            <Tooltip contentStyle={{ fontSize: 12 }} cursor={{ fill: '#f3f4f6' }} />
            <Bar dataKey="count" fill="#8b5cf6" radius={[0, 3, 3, 0]} />
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
        <CardTitle className="text-base">OTA Coverage</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} layout="vertical" margin={{ left: 110, right: 20, top: 4, bottom: 4 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis
              type="category"
              dataKey="channel"
              width={105}
              tick={{ fontSize: 11, fill: '#6b7280' }}
            />
            <Tooltip contentStyle={{ fontSize: 12 }} cursor={{ fill: '#f3f4f6' }} />
            <Bar dataKey="count" fill="#14b8a6" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
