'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useSWR, { useSWRConfig } from 'swr';
import type { RowSelectionState, VisibilityState } from '@tanstack/react-table';
import { Plus, Search, X, LayoutGrid, Table2 } from 'lucide-react';
import { ProductTable } from '@/components/products/product-table';
import { ProductCards } from '@/components/products/product-cards';
import { ProductDetailSheet } from '@/components/products/product-detail-sheet';
import { FilterBar, DEFAULT_FILTERS, type Filters } from '@/components/products/filter-bar';
import { ViewsBar, type CustomView } from '@/components/products/views-bar';
import { COLUMN_GROUPS } from '@/lib/constants';
import { ProductForm } from '@/components/products/product-form';
import { BulkActionsToolbar } from '@/components/products/bulk-actions-toolbar';
import { DeleteConfirmDialog } from '@/components/products/delete-confirm-dialog';
import { ExportButton } from '@/components/products/export-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { TourProduct } from '@/lib/types';
import { fetcher } from '@/lib/fetcher';

type ViewMode = 'table' | 'cards';

const ALL_FIELD_IDS = COLUMN_GROUPS.flatMap((g) => g.fields as readonly string[]);

interface ProductsClientProps {
  initialFilters?: Filters;
  initialSearch?: string;
}

export function ProductsClient({ initialFilters, initialSearch }: ProductsClientProps = {}) {
  const router = useRouter();
  const pathname = usePathname();

  const [activeView, setActiveView] = useState<ViewMode>('table');
  const [filters, setFilters] = useState<Filters>(initialFilters ?? DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState(initialSearch ?? '');
  const [globalSearch, setGlobalSearch] = useState(initialSearch ?? '');
  const [addOpen, setAddOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [deleteTarget, setDeleteTarget] = useState<TourProduct | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<TourProduct | null>(null);
  const [activeViewId, setActiveViewId] = useState<string>('default');
  const [customViews, setCustomViews] = useState<CustomView[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('sheet-admin:custom-views');
      return stored ? (JSON.parse(stored) as CustomView[]) : [];
    } catch {
      return [];
    }
  });
  const selectedProductRowIndex = selectedProduct?.rowIndex ?? null;

  const updateUrl = useCallback((newFilters: Filters, newSearch: string) => {
    const params = new URLSearchParams();
    newFilters.country.forEach((country) => params.append('country', country));
    newFilters.city.forEach((city) => params.append('city', city));
    newFilters.productTypes.forEach(t => params.append('type', t));
    newFilters.statuses.forEach(s => params.append('status', s));
    if (newFilters.readyForUpload !== 'all') params.set('ready', newFilters.readyForUpload);
    if (newSearch) params.set('q', newSearch);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [router, pathname]);

  useEffect(() => {
    updateUrl(filters, globalSearch);
  }, [filters, globalSearch, updateUrl]);

  const { mutate } = useSWRConfig();
  const { data: products, error, isLoading } = useSWR<TourProduct[]>('/api/products', fetcher, {
    dedupingInterval: 60_000,
    refreshInterval: 30_000,
  });

  useEffect(() => {
    if (!selectedProductRowIndex || !products) return;

    const latestProduct = products.find((product) => product.rowIndex === selectedProductRowIndex);
    if (!latestProduct) {
      setSelectedProduct(null);
      return;
    }

    setSelectedProduct(latestProduct);
  }, [products, selectedProductRowIndex]);

  useEffect(() => {
    const timer = setTimeout(() => setGlobalSearch(searchInput), 200);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filteredProducts = useMemo(() => {
    const all = products ?? [];
    return all.filter((p) => {
      if (filters.country.length && !filters.country.includes(p.country ?? '')) return false;
      if (filters.city.length && !filters.city.includes(p.city ?? '')) return false;
      if (filters.productTypes.length && !filters.productTypes.includes(p.productType ?? '')) return false;
      if (filters.statuses.length && !filters.statuses.includes(p.productStatus ?? '')) return false;
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

  const columnVisibility = useMemo((): VisibilityState => {
    const base: VisibilityState = Object.fromEntries(ALL_FIELD_IDS.map((id) => [id, false]));

    if (activeViewId === 'default') {
      return { ...base, product: true, location: true, type: true, status: true };
    }

    const view = customViews.find((v) => v.id === activeViewId);
    if (!view) {
      return { ...base, product: true, location: true, type: true, status: true };
    }

    const cols = new Set(view.columns);
    return {
      ...base,
      product: cols.has('product'),
      location: cols.has('location'),
      type: cols.has('type'),
      status: cols.has('status'),
      ...Object.fromEntries(ALL_FIELD_IDS.map((id) => [id, cols.has(id)])),
    };
  }, [activeViewId, customViews]);

  function handleViewAdd(view: CustomView) {
    const next = [...customViews, view];
    setCustomViews(next);
    localStorage.setItem('sheet-admin:custom-views', JSON.stringify(next));
    setActiveViewId(view.id);
  }

  function handleViewDelete(id: string) {
    const next = customViews.filter((v) => v.id !== id);
    setCustomViews(next);
    localStorage.setItem('sheet-admin:custom-views', JSON.stringify(next));
    if (activeViewId === id) setActiveViewId('default');
  }

  const totalCount = products?.length ?? 0;
  const filteredCount = searchedProducts.length;

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/15 dark:text-red-300">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>Failed to load products: {error.message ?? 'Unknown error'}</span>
          <button onClick={() => mutate('/api/products')} className="text-left underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

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
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-[hsl(var(--text-secondary))]">
            {isLoading
              ? 'Loading...'
              : `Showing ${filteredCount} of ${totalCount} products`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--text-tertiary))]" />
            <Input
              className="w-full pl-8 pr-8 sm:w-60"
              placeholder="Search..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--text-tertiary))] transition-colors hover:text-[hsl(var(--text-primary))]"
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-0.5">
            <Button
              variant={activeView === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 gap-1.5 px-2.5"
              onClick={() => setActiveView('table')}
            >
              <Table2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Table</span>
            </Button>
            <Button
              variant={activeView === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 gap-1.5 px-2.5"
              onClick={() => setActiveView('cards')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </Button>
          </div>
          <ExportButton products={searchedProducts} columnVisibility={columnVisibility} />
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      <ViewsBar
        activeViewId={activeViewId}
        customViews={customViews}
        onViewSelect={setActiveViewId}
        onViewDelete={handleViewDelete}
        onViewAdd={handleViewAdd}
      />
      <FilterBar filters={filters} onFiltersChange={setFilters} />

      {activeView === 'table' && (
        <BulkActionsToolbar
          selectedProducts={selectedProducts}
          onClearSelection={() => setRowSelection({})}
          onMutate={() => mutate('/api/products')}
        />
      )}

      {!isLoading && (
        <div className="flex items-center gap-2">
          <Badge variant="outline">{filteredCount} visible</Badge>
          {globalSearch && <Badge variant="info">Search: {globalSearch}</Badge>}
        </div>
      )}

      {activeView === 'table' ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ProductTable
            data={searchedProducts}
            isLoading={isLoading}
            error={error}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            onDeleteRequest={(product) => setDeleteTarget(product)}
            onEditRequest={(product) => setSelectedProduct(product)}
            onRowClick={(product) => setSelectedProduct(product)}
            columnVisibility={columnVisibility}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <ProductCards
            data={searchedProducts}
            isLoading={isLoading}
            onCardClick={(product) => setSelectedProduct(product)}
          />
        </div>
      )}
      <ProductDetailSheet
        product={selectedProduct}
        open={selectedProduct !== null}
        onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}
        onSaved={(product) => {
          setSelectedProduct(product);
          mutate('/api/products');
        }}
      />
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
