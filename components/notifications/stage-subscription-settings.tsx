'use client';

import useSWR from 'swr';
import { ASSEMBLY_STAGES, type AssemblyStage } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { fetcher } from '@/lib/fetcher';

export function StageSubscriptionSettings() {
  const { data, mutate } = useSWR<{ stages: AssemblyStage[] }>(
    '/api/notifications/subscriptions',
    fetcher,
  );

  const subscribedStages = data?.stages ?? [];

  const handleToggle = async (stage: AssemblyStage, checked: boolean) => {
    const next = checked
      ? [...subscribedStages, stage]
      : subscribedStages.filter((s) => s !== stage);

    await mutate(
      async () => {
        await fetch('/api/notifications/subscriptions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stages: next }),
        });
        return { stages: next };
      },
      { optimisticData: { stages: next }, rollbackOnError: true },
    );
  };

  return (
    <div className="space-y-1 px-1 py-1">
      <p className="px-2 pb-1 text-xs font-medium text-[hsl(var(--text-secondary))]">
        Notify me when a batch reaches
      </p>
      {ASSEMBLY_STAGES.map((stage) => (
        <div
          key={stage}
          className="flex items-center justify-between rounded-md px-2 py-1.5"
        >
          <Label
            htmlFor={`stage-sub-${stage}`}
            className="cursor-pointer text-sm font-normal"
          >
            {stage}
          </Label>
          <Switch
            id={`stage-sub-${stage}`}
            checked={subscribedStages.includes(stage)}
            onCheckedChange={(checked) => handleToggle(stage, checked)}
          />
        </div>
      ))}
    </div>
  );
}
