'use client';

import { ASSEMBLY_STAGES, type AssemblyResponse, type AssemblyStage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getStageStaleness } from './batch-helpers';

interface PipelineSummaryProps {
  assemblyData: AssemblyResponse;
  onStageClick: (stage: AssemblyStage) => void;
}

export function PipelineSummary({ assemblyData, onStageClick }: PipelineSummaryProps) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {ASSEMBLY_STAGES.map((stage) => {
        const stageData = assemblyData[stage];
        const totalProducts = stageData.batches.reduce((s, b) => s + b.productRowIndexes.length, 0);
        const staleness = stage !== 'Uploaded' ? getStageStaleness(stageData.batches) : 'none';

        return (
          <button
            key={stage}
            type="button"
            onClick={() => onStageClick(stage)}
            className={cn(
              'flex flex-col gap-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2.5 text-left transition-colors hover:bg-[hsl(var(--surface-raised))]',
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-xs font-medium text-[hsl(var(--text-secondary))]">{stage}</span>
              {staleness !== 'none' && (
                <span
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    staleness === 'red' ? 'bg-red-500' : 'bg-yellow-500',
                  )}
                  title={staleness === 'red' ? 'Batch stuck >7 days' : 'Batch stuck >3 days'}
                />
              )}
            </div>
            <span className="text-sm font-semibold text-[hsl(var(--text-primary))]">{totalProducts}</span>
            <span className="text-xs text-[hsl(var(--text-tertiary))]">
              {totalProducts === 1 ? 'product' : 'products'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
