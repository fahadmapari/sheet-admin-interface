// app/(app)/written-products/written-products-client.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import type { VisibilityState } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { WrittenProduct } from '@/lib/types';
import { fetcher } from '@/lib/fetcher';
import { WrittenProductTable } from '@/components/written-products/written-product-table';
import { WrittenProductDetailSheet } from '@/components/written-products/written-product-detail-sheet';
import {
  WrittenProductFilterBar,
} from '@/components/written-products/written-product-filter-bar';
import {
  DEFAULT_WP_FILTERS,
  WP_MULTI_SELECT_FILTERS,
  WP_TRI_STATE_FILTERS,
  type WrittenProductFilters,
} from '@/lib/written-product-filters';
import { WrittenProductExportButton } from '@/components/written-products/written-product-export-button';
import { WrittenProductForm } from '@/components/written-products/written-product-form';
import { WrittenViewsBar, type CustomView } from '@/components/written-products/written-views-bar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const ALL_WP_COLUMN_IDS = [
  'textLink', 'country', 'cityDestination', 'state', 'tourType',
  'ccOk', 'isOk', 'rrOk', 'ssOk', 'contentExist', 'b2b', 'b2c', 'ssNotes',
];

export function WrittenProductsClient() {
  const { data: products, isLoading, error } = useSWR<WrittenProduct[]>(
    '/api/written-products',
    fetcher,
    { dedupingInterval: 60_000 },
  );
  const { mutate } = useSWRConfig();

  const [filters, setFilters] = useState<WrittenProductFilters>(DEFAULT_WP_FILTERS);
  const [editProduct, setEditProduct] = useState<WrittenProduct | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<WrittenProduct | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [activeViewId, setActiveViewId] = useState<string>('default');
  const [customViews, setCustomViews] = useState<CustomView[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sheet-admin:written-custom-views');
      if (stored) setCustomViews(JSON.parse(stored) as CustomView[]);
    } catch {
      // ignore malformed storage
    }
  }, []);

  const columnVisibility = useMemo((): VisibilityState => {
    if (activeViewId === 'default') return {};
    const view = customViews.find((v) => v.id === activeViewId);
    if (!view) return {};
    const cols = new Set(view.columns);
    return Object.fromEntries(ALL_WP_COLUMN_IDS.map((id) => [id, cols.has(id)]));
  }, [activeViewId, customViews]);

  const handleViewAdd = useCallback((view: CustomView) => {
    const next = [...customViews, view];
    setCustomViews(next);
    localStorage.setItem('sheet-admin:written-custom-views', JSON.stringify(next));
    setActiveViewId(view.id);
  }, [customViews]);

  const handleViewDelete = useCallback((id: string) => {
    const next = customViews.filter((v) => v.id !== id);
    setCustomViews(next);
    localStorage.setItem('sheet-admin:written-custom-views', JSON.stringify(next));
    if (activeViewId === id) setActiveViewId('default');
  }, [customViews, activeViewId]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const search = filters.search.toLowerCase();
    return products.filter((p) => {
      if (
        search &&
        ![p.textLink, p.country, p.cityDestination].some((v) =>
          v?.toLowerCase().includes(search),
        )
      )
        return false;
      for (const f of WP_MULTI_SELECT_FILTERS) {
        const selected = filters[f.key];
        if (selected.length > 0 && !selected.includes(p[f.productKey] as string)) return false;
      }
      for (const f of WP_TRI_STATE_FILTERS) {
        const state = filters[f.key];
        if (state === 'all') continue;
        const val = Boolean(p[f.productKey]);
        if (state === 'yes' && !val) return false;
        if (state === 'no' && val) return false;
      }
      return true;
    });
  }, [products, filters]);

  async function handleCreate(data: Omit<WrittenProduct, 'rowIndex'>) {
    setIsCreating(true);
    try {
      const res = await fetch('/api/written-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      await mutate('/api/written-products');
      setCreateOpen(false);
      toast.success('Created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteProduct) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/written-products/${deleteProduct.rowIndex}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) throw new Error(await res.text());
      await mutate('/api/written-products');
      setDeleteProduct(null);
      toast.success('Deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  }

  function handleSaved(updated: WrittenProduct) {
    mutate(
      '/api/written-products',
      (current: WrittenProduct[] | undefined) =>
        current?.map((p) => (p.rowIndex === updated.rowIndex ? updated : p)),
      false,
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
        <h1 className="text-sm font-medium text-[hsl(var(--text-primary))]">
          Written Products
          {filteredProducts.length > 0 && (
            <span className="ml-2 text-[hsl(var(--text-tertiary))] font-normal">
              ({filteredProducts.length})
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          <WrittenProductExportButton products={filteredProducts} />
          <Button size="sm" className="h-8 gap-1.5 text-sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>

      <div className="px-4 py-2 border-b border-[hsl(var(--border))]">
        <WrittenViewsBar
          activeViewId={activeViewId}
          customViews={customViews}
          onViewSelect={setActiveViewId}
          onViewDelete={handleViewDelete}
          onViewAdd={handleViewAdd}
        />
      </div>

      <div className="px-4 py-2 border-b border-[hsl(var(--border))]">
        <WrittenProductFilterBar
          allProducts={products ?? []}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        {isLoading && (
          <div className="flex items-center justify-center h-40 text-sm text-[hsl(var(--text-tertiary))]">
            Loading…
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-40 text-sm text-destructive">
            Failed to load: {(error as Error).message}
          </div>
        )}
        {!isLoading && !error && (
          <WrittenProductTable
            products={filteredProducts}
            onEdit={setEditProduct}
            columnVisibility={columnVisibility}
          />
        )}
      </div>

      <WrittenProductDetailSheet
        product={editProduct}
        onClose={() => setEditProduct(null)}
        onSaved={handleSaved}
        onDelete={(p) => { setEditProduct(null); setDeleteProduct(p); }}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Written Product</DialogTitle>
          </DialogHeader>
          <WrittenProductForm
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            isSubmitting={isCreating}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteProduct !== null}
        onOpenChange={(open) => !open && setDeleteProduct(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete this entry?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[hsl(var(--text-secondary))]">
            &ldquo;{deleteProduct?.textLink}&rdquo; will be permanently removed from the sheet.
            This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteProduct(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
