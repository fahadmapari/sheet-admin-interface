'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BatchCard } from './batch-card';
import type { AssemblyBatch, AssemblyStage, TourProduct } from '@/lib/types';

interface StageSectionProps {
  stage: AssemblyStage;
  batches: AssemblyBatch[];
  products: TourProduct[];
  movingBatchId: string | null;
  onBatchMoveToNextStage: (batch: AssemblyBatch) => Promise<void>;
  onBatchMoveToStage: (batch: AssemblyBatch, targetStage: AssemblyStage) => Promise<void>;
  onProductClick: (product: TourProduct) => void;
}

export function StageSection({
  stage,
  batches,
  products,
  movingBatchId,
  onBatchMoveToNextStage,
  onBatchMoveToStage,
  onProductClick,
}: StageSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const totalProducts = batches.reduce((sum, b) => sum + b.productRowIndexes.length, 0);

  return (
    <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
      <button
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-[hsl(var(--surface-raised))] transition-colors rounded-lg"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--text-tertiary))]" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-[hsl(var(--text-tertiary))]" />
        )}
        <span className="flex-1 text-sm font-semibold text-[hsl(var(--text-primary))]">
          {stage}
        </span>
        <Badge variant="outline" className="text-xs">
          {totalProducts} product{totalProducts !== 1 ? 's' : ''}
        </Badge>
      </button>

      {!collapsed && (
        <div className="border-t border-[hsl(var(--border))] px-5 py-3 space-y-2">
          {batches.length === 0 ? (
            <p className="py-2 text-sm text-[hsl(var(--text-tertiary))]">No batches in this stage.</p>
          ) : (
            batches.map((batch) => (
              <BatchCard
                key={batch._id}
                batch={batch}
                products={products}
                isMoving={movingBatchId === batch._id}
                onMoveToNextStage={onBatchMoveToNextStage}
                onMoveToStage={onBatchMoveToStage}
                onProductClick={onProductClick}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
