'use client';

import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { Layers } from 'lucide-react';
import { StageSection } from '@/components/assembly/stage-section';
import { ProductDetailSheet } from '@/components/products/product-detail-sheet';
import { fetcher } from '@/lib/fetcher';
import { ASSEMBLY_STAGES, type AssemblyResponse, type TourProduct } from '@/lib/types';

export function AssemblyClient() {
  const { mutate } = useSWRConfig();
  const { data: assemblyData, error: assemblyError, isLoading: assemblyLoading } =
    useSWR<AssemblyResponse>('/api/assembly', fetcher, { dedupingInterval: 10_000 });

  const { data: products } = useSWR<TourProduct[]>('/api/products', fetcher, {
    dedupingInterval: 60_000,
  });

  const [selectedProduct, setSelectedProduct] = useState<TourProduct | null>(null);

  if (assemblyError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/15 dark:text-red-300">
        Failed to load assembly data: {assemblyError.message ?? 'Unknown error'}
      </div>
    );
  }

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
              onProductClick={(product) => setSelectedProduct(product)}
            />
          ))}
        </div>
      )}

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
