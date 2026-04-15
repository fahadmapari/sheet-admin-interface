'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DangerCardProps {
  title: string;
  description: string;
  target: 'assembly' | 'notifications';
}

function DangerCard({ title, description, target }: DangerCardProps) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClear = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        toast.error(data.error ?? 'Failed to clear data');
        return;
      }
      const data = await res.json() as { deletedCount?: number };
      toast.success(`Cleared ${data.deletedCount ?? 0} record${data.deletedCount !== 1 ? 's' : ''}`);
      setValue('');
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <h3 className="text-sm font-semibold text-[hsl(var(--text-primary))]">{title}</h3>
      <p className="mt-1 text-sm text-[hsl(var(--text-secondary))]">{description}</p>
      <div className="mt-3 flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder='Type "CLEAR" to confirm'
          className="h-8 w-48 text-sm"
          aria-label={`Type CLEAR to enable ${title}`}
        />
        <Button
          variant="destructive"
          size="sm"
          disabled={value !== 'CLEAR' || loading}
          onClick={handleClear}
        >
          {loading ? 'Clearing…' : 'Clear'}
        </Button>
      </div>
    </div>
  );
}

export function DataSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-[hsl(var(--text-primary))]">Danger Zone</h2>
        <p className="mt-1 text-sm text-[hsl(var(--text-secondary))]">
          These actions are permanent and cannot be undone.
        </p>
      </div>
      <div className="space-y-3">
        <DangerCard
          title="Clear Assembly Data"
          description="Permanently removes all batches and products from all assembly stages. Products in Google Sheets are not affected."
          target="assembly"
        />
        <DangerCard
          title="Clear Notifications"
          description="Permanently deletes all notifications from the database."
          target="notifications"
        />
      </div>
    </div>
  );
}
