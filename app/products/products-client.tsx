'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import type { VisibilityState, RowSelectionState } from '@tanstack/react-table';
import { Plus, Search, X } from 'lucide-react';
import { ProductTable } from '@/components/products/product-table';
import { ColumnVisibilityPanel } from '@/components/products/column-visibility';
import { FilterBar, DEFAULT_FILTERS, type Filters } from '@/components/products/filter-bar';
import { ProductForm } from '@/components/products/product-form';
import { BulkActionsToolbar } from '@/components/products/bulk-actions-toolbar';
import { DeleteConfirmDialog } from '@/components/products/delete-confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { TourProduct } from '@/lib/types';
import { fetcher } from '@/lib/fetcher';

export function ProductsClient() {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [deleteTarget, setDeleteTarget] = useState<TourProduct | null>(null);

  const { mutate } = useSWRConfig();
  const { data: products, error, isLoading } = useSWR<TourProduct[]>('/api/products', fetcher, {
    dedupingInterval: 60_000,
  });

  useEffect(() => {
    const timer = setTimeout(() => setGlobalSearch(searchInput), 200);
    return () => clearTimeout(timer);
  }, [searchInput]);

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

  const searchedProducts = useMemo(() => {
    if (!globalSearch.trim()) return filteredProducts;
    const q = globalSearch.toLowerCase();
    return filteredProducts.filter(p =>
      [p.country, p.city, p.productName, p.link, p.notes, p.productType]
        .some(v => v?.toLowerCase().includes(q))
    );
  }, [filteredProducts, globalSearch]);

  const selectedProducts = useMemo(() => {
    return searchedProducts.filter((_, i) => rowSelection[i]);
  }, [searchedProducts, rowSelection]);

  const totalCount = products?.length ?? 0;
  const filteredCount = searchedProducts.length;

  const handleSingleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/products/${deleteTarget.rowIndex}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Product deleted');
      mutate('/api/products');
    } else {
      toast.error('Delete failed');
    }
  };

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
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-8 pr-8 w-56"
              placeholder="Search…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <ColumnVisibilityPanel
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
          />
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Product
          </Button>
        </div>
      </div>
      <FilterBar filters={filters} onFiltersChange={setFilters} />
      <BulkActionsToolbar
        selectedProducts={selectedProducts}
        onClearSelection={() => setRowSelection({})}
        onMutate={() => mutate('/api/products')}
      />
      <div className="flex-1 overflow-hidden">
        <ProductTable
          data={searchedProducts}
          isLoading={isLoading}
          error={error}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          onDeleteRequest={(product) => setDeleteTarget(product)}
        />
      </div>
      <ProductForm open={addOpen} onClose={() => setAddOpen(false)} />
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        count={1}
        onConfirm={handleSingleDelete}
      />
    </div>
  );
}
