'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import type { VisibilityState } from '@tanstack/react-table';
import { ProductTable } from '@/components/products/product-table';
import { ColumnVisibilityPanel } from '@/components/products/column-visibility';
import { FilterBar, DEFAULT_FILTERS, type Filters } from '@/components/products/filter-bar';
import type { TourProduct } from '@/lib/types';

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(r.statusText);
    return r.json();
  });

export function ProductsClient() {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const { data: products, error, isLoading } = useSWR<TourProduct[]>('/api/products', fetcher, {
    dedupingInterval: 60_000,
  });

  const filteredProducts = useMemo(() => {
    const all = products ?? [];
    return all.filter((p) => {
      if (filters.country && p.country !== filters.country) return false;
      if (filters.city && p.city !== filters.city) return false;
      if (filters.productTypes.length && !filters.productTypes.includes(p.productType ?? '')) return false;
      if (filters.statuses.length && !filters.statuses.includes(p.productStatus ?? '')) return false;
      if (filters.pics.length && !filters.pics.includes(p.pic ?? '')) return false;
      if (filters.readyForUpload === 'yes' && !p.readyForUpload) return false;
      if (filters.readyForUpload === 'no' && p.readyForUpload) return false;
      return true;
    });
  }, [products, filters]);

  const totalCount = products?.length ?? 0;
  const filteredCount = filteredProducts.length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h1 className="text-xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? 'Loading…'
              : `Showing ${filteredCount} of ${totalCount} products`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ColumnVisibilityPanel
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
          />
        </div>
      </div>
      <FilterBar filters={filters} onFiltersChange={setFilters} />
      <div className="flex-1 overflow-hidden">
        <ProductTable
          data={filteredProducts}
          isLoading={isLoading}
          error={error}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
        />
      </div>
    </div>
  );
}
