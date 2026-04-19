'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { WrittenProduct } from '@/lib/types';

interface WrittenProductsChartsProps {
  writtenProducts: WrittenProduct[];
}

const CONTENT_FLAGS: { key: keyof WrittenProduct; label: string }[] = [
  { key: 'ccOk', label: 'CC OK' },
  { key: 'isOk', label: 'IS OK' },
  { key: 'rrOk', label: 'RR OK' },
  { key: 'ssOk', label: 'SS OK' },
  { key: 'contentExist', label: 'Content Exists' },
  { key: 'ssNotes', label: 'SS Notes' },
];

const CHANNEL_FLAGS: { key: keyof WrittenProduct; label: string }[] = [
  { key: 'b2b', label: 'B2B' },
  { key: 'b2c', label: 'B2C' },
];

function FlagProgressBar({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-[hsl(var(--text-secondary))]">{label}</span>
        <span className="font-medium text-[hsl(var(--text-primary))]">
          {count.toLocaleString()} / {total.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--surface-raised))]">
        <div
          className="h-full rounded-full bg-[hsl(var(--accent))] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function WrittenContentCompletion({ writtenProducts }: WrittenProductsChartsProps) {
  const total = writtenProducts.length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Completion</CardTitle>
        <CardDescription>Approval flag coverage across written products</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {CONTENT_FLAGS.map(({ key, label }) => (
          <FlagProgressBar
            key={key}
            count={writtenProducts.filter((p) => p[key] === true).length}
            label={label}
            total={total}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export function WrittenChannelCoverage({ writtenProducts }: WrittenProductsChartsProps) {
  const total = writtenProducts.length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel Coverage</CardTitle>
        <CardDescription>B2B and B2C availability across written products</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {CHANNEL_FLAGS.map(({ key, label }) => (
          <FlagProgressBar
            key={key}
            count={writtenProducts.filter((p) => p[key] === true).length}
            label={label}
            total={total}
          />
        ))}
      </CardContent>
    </Card>
  );
}
