'use client';

import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { Layers } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StageSection } from '@/components/assembly/stage-section';
import { ProductDetailSheet } from '@/components/products/product-detail-sheet';
import { fetcher } from '@/lib/fetcher';
import {
  ASSEMBLY_STAGES,
  type AssemblyBatch,
  type AssemblyResponse,
  type AssemblyStage,
  type TourProduct,
} from '@/lib/types';

interface ArchivedResponse {
  batches: AssemblyBatch[];
}

export function AssemblyClient({ isAdmin }: { isAdmin: boolean }) {
  const { mutate } = useSWRConfig();
  const { data: assemblyData, error: assemblyError, isLoading: assemblyLoading } =
    useSWR<AssemblyResponse>('/api/assembly', fetcher, { dedupingInterval: 10_000 });

  const { data: archivedData, isLoading: archivedLoading } =
    useSWR<ArchivedResponse>('/api/assembly/archived', fetcher, { dedupingInterval: 60_000 });

  const { data: products } = useSWR<TourProduct[]>('/api/products', fetcher, {
    dedupingInterval: 60_000,
  });

  const [selectedProduct, setSelectedProduct] = useState<TourProduct | null>(null);
  const [movingBatchId, setMovingBatchId] = useState<string | null>(null);
  const [movingProductRowIndex, setMovingProductRowIndex] = useState<number | null>(null);

  const getNextStage = (stage: AssemblyStage): AssemblyStage | null => {
    const currentIndex = ASSEMBLY_STAGES.indexOf(stage);
    if (currentIndex === -1 || currentIndex >= ASSEMBLY_STAGES.length - 1) {
      return null;
    }
    return ASSEMBLY_STAGES[currentIndex + 1];
  };

  const moveBatchToStage = async (batch: AssemblyBatch, targetStage: AssemblyStage) => {
    setMovingBatchId(batch._id);
    try {
      const moveRes = await fetch('/api/assembly/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowIndexes: batch.productRowIndexes,
          targetStage,
          batchStrategy: { type: 'new', name: batch.name },
        }),
      });

      if (!moveRes.ok) {
        toast.error('Batch move failed');
        return;
      }

      toast.success(`Moved batch "${batch.name}" to "${targetStage}"`);
      mutate('/api/assembly');
      if (targetStage === 'Ready for Upload') {
        mutate('/api/products');
      }
    } finally {
      setMovingBatchId(null);
    }
  };

  const handleBatchMoveToNextStage = async (batch: AssemblyBatch) => {
    const nextStage = getNextStage(batch.stage);
    if (!nextStage) return;
    await moveBatchToStage(batch, nextStage);
  };

  const handleBatchMoveToStage = async (batch: AssemblyBatch, targetStage: AssemblyStage) => {
    await moveBatchToStage(batch, targetStage);
  };

  const handleProductMoveToNextStage = async (product: TourProduct, batch: AssemblyBatch) => {
    const nextStage = getNextStage(batch.stage);
    if (!nextStage) return;

    setMovingProductRowIndex(product.rowIndex);
    try {
      const moveRes = await fetch('/api/assembly/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowIndexes: [product.rowIndex],
          targetStage: nextStage,
          batchStrategy: { type: 'new', name: batch.name },
        }),
      });

      if (!moveRes.ok) {
        toast.error('Move failed');
        return;
      }

      toast.success(`Moved product to "${nextStage}"`);
      mutate('/api/assembly');
      if (nextStage === 'Ready for Upload') {
        mutate('/api/products');
      }
    } finally {
      setMovingProductRowIndex(null);
    }
  };

  const handleRemoveBatch = async (batchId: string) => {
    const res = await fetch(`/api/assembly/${batchId}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Failed to remove batch');
      return;
    }
    toast.success('Batch removed from assembly');
    mutate('/api/assembly');
  };

  const handleRemoveProduct = async (rowIndex: number) => {
    const res = await fetch(`/api/assembly/product/${rowIndex}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Failed to remove product');
      return;
    }
    toast.success('Product removed from assembly');
    mutate('/api/assembly');
  };

  if (assemblyError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/15 dark:text-red-300">
        Failed to load assembly data: {assemblyError.message ?? 'Unknown error'}
      </div>
    );
  }

  const archivedCount = archivedData?.batches.length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Layers className="h-5 w-5" />
          Assembly Line
        </h1>
        <p className="mt-1 text-sm text-[hsl(var(--text-secondary))]">
          Track products through production stages.
        </p>
      </div>

      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">Assembly Line</TabsTrigger>
          <TabsTrigger value="archived" className="gap-1.5">
            Archived
            {archivedCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {archivedCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-4">
          {assemblyLoading ? (
            <div className="space-y-3">
              {ASSEMBLY_STAGES.map((stage) => (
                <div
                  key={stage}
                  className="h-14 animate-pulse rounded-lg bg-[hsl(var(--surface))]"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {ASSEMBLY_STAGES.map((stage) => (
                <StageSection
                  key={stage}
                  stage={stage}
                  batches={assemblyData?.[stage]?.batches ?? []}
                  products={products ?? []}
                  movingBatchId={movingBatchId}
                  movingProductRowIndex={movingProductRowIndex}
                  isAdmin={isAdmin}
                  onBatchMoveToNextStage={handleBatchMoveToNextStage}
                  onBatchMoveToStage={handleBatchMoveToStage}
                  onMoveProductToNextStage={(product, batch) =>
                    handleProductMoveToNextStage(product, batch)
                  }
                  onProductClick={(product) => setSelectedProduct(product)}
                  onRemoveBatch={handleRemoveBatch}
                  onRemoveProduct={handleRemoveProduct}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-4">
          {archivedLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-[hsl(var(--surface))]" />
              ))}
            </div>
          ) : archivedCount === 0 ? (
            <p className="py-6 text-center text-sm text-[hsl(var(--text-tertiary))]">
              No archived batches yet. Batches move here after spending more than 7 days in Uploaded.
            </p>
          ) : (
            <div className="space-y-3">
              <StageSection
                stage="Uploaded"
                batches={archivedData?.batches ?? []}
                products={[]}
                movingBatchId={null}
                movingProductRowIndex={null}
                isAdmin={false}
                readOnly={true}
                onBatchMoveToNextStage={async () => {}}
                onBatchMoveToStage={async () => {}}
                onMoveProductToNextStage={async () => {}}
                onProductClick={() => {}}
                onRemoveBatch={async () => {}}
                onRemoveProduct={async () => {}}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ProductDetailSheet
        product={selectedProduct}
        open={selectedProduct !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedProduct(null);
        }}
        onSaved={(product) => {
          setSelectedProduct(product);
          mutate('/api/products');
          mutate('/api/assembly');
        }}
      />
    </div>
  );
}
