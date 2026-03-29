import type { ComponentProps, ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface KpiCardProps {
  title: string;
  value: number;
  total?: number;
  tone?: 'default' | 'success' | 'warning' | 'error' | 'info';
  icon?: ReactNode;
}

const toneVariant: Record<NonNullable<KpiCardProps['tone']>, ComponentProps<typeof Badge>['variant']> = {
  default: 'outline',
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
};

export function KpiCard({ title, value, total, tone = 'default', icon }: KpiCardProps) {
  const percentage = total && total > 0 ? Math.round((value / total) * 100) : null;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <CardTitle>{title}</CardTitle>
        {icon && <div className="mt-0.5 text-[hsl(var(--text-tertiary))]">{icon}</div>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="text-2xl font-semibold tracking-tight text-[hsl(var(--text-primary))]">
          {value.toLocaleString()}
        </div>
        {total !== undefined && percentage !== null && (
          <div className="flex items-center gap-2">
            <Badge variant={toneVariant[tone]}>{percentage}%</Badge>
            <span className="text-xs text-[hsl(var(--text-secondary))]">
              {value.toLocaleString()} of {total.toLocaleString()}
            </span>
          </div>
        )}
        {total === undefined && (
          <p className="text-xs text-[hsl(var(--text-secondary))]">Current total</p>
        )}
      </CardContent>
    </Card>
  );
}
