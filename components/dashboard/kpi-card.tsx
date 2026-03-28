import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface KpiCardProps {
  title: string;
  value: number;
  total?: number;
  color?: 'default' | 'green' | 'amber' | 'red' | 'gray';
  icon?: React.ReactNode;
}

const colorClasses: Record<NonNullable<KpiCardProps['color']>, string> = {
  default: '',
  green: 'text-green-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
  gray: 'text-gray-400',
};

export function KpiCard({ title, value, total, color = 'default', icon }: KpiCardProps) {
  const valueColor = colorClasses[color];
  const percentage = total && total > 0 ? Math.round((value / total) * 100) : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${valueColor}`}>{value.toLocaleString()}</div>
        {total !== undefined && percentage !== null && (
          <p className="text-xs text-muted-foreground mt-1">
            {value.toLocaleString()} / {total.toLocaleString()} ({percentage}%)
          </p>
        )}
      </CardContent>
    </Card>
  );
}
