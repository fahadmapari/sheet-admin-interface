// app/(app)/written-products/written-products-client.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import type { VisibilityState } from '@tanstack/react-table';
import { Plus, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { WrittenProduct } from '@/lib/types';
import { fetcher } from '@/lib/fetcher';
import { cn, parseLinkField } from '@/lib/utils';
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
import { useEditHistory, type EditRecord } from '@/lib/hooks/use-edit-history';
import { EditHistoryPopover } from '@/components/ui/edit-history-popover';
import { WrittenProductForm } from '@/components/written-products/written-product-form';
import { WrittenViewsBar, type CustomView } from '@/components/written-products/written-views-bar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const ALL_WP_COLUMN_IDS = [
  'textLink', 'location', 'country', 'cityDestination', 'state', 'tourType',
  'ccOk', 'isOk', 'rrOk', 'ssOk', 'contentExist', 'b2b', 'b2c', 'ssNotes',
];

export function WrittenProductsClient() {
  const { data: products, isLoading, error } = useSWR<WrittenProduct[]>(
    '/api/written-products',
    fetcher,
    { dedupingInterval: 60_000 },
  );
  const { data: titlesData, isLoading: titlesLoading } = useSWR<{ titles: string[] }>(
    '/api/products/titles',
    fetcher,
    { dedupingInterval: 60_000 },
  );
  const { mutate } = useSWRConfig();

  type WrittenProductPayload = {
    rowIndex: number;
    snapshot: Omit<WrittenProduct, 'rowIndex'>;
  };

  const buildWrittenProductRevertFn = useCallback(
    (payload: WrittenProductPayload) => async () => {
      const res = await fetch(`/api/written-products/${payload.rowIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.snapshot),
      });
      if (!res.ok) throw new Error(await res.text());
      await mutate('/api/written-products');
    },
    [mutate],
  );

  const { history, push, revert } = useEditHistory<WrittenProductPayload>({
    storageKey: 'sheet-admin:edit-history:written-products',
    buildRevertFn: buildWrittenProductRevertFn,
  });

  const productTitlesSet = useMemo(
    () => new Set<string>(titlesData?.titles ?? []),
    [titlesData],
  );

  const [filters, setFilters] = useState<WrittenProductFilters>(DEFAULT_WP_FILTERS);
  const [editProduct, setEditProduct] = useState<WrittenProduct | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<WrittenProduct | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
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

  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen]);

  useEffect(() => {
    document.body.style.overflow = isFullscreen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isFullscreen]);

  const columnVisibility = useMemo((): VisibilityState => {
    if (activeViewId === 'default') return { country: false, cityDestination: false, state: false, ssNotes: false };
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
      if (filters.inProducts !== 'all' && titlesData) {
        const title = parseLinkField(p.textLink ?? '').text.toLowerCase();
        const matched = productTitlesSet.has(title);
        if (filters.inProducts === 'yes' && !matched) return false;
        if (filters.inProducts === 'no' && matched) return false;
      }
      return true;
    });
  }, [products, filters, productTitlesSet]);

  const existingTitles = useMemo(
    () => new Set(
      (products ?? [])
        .map((p) => p.textLink ? parseLinkField(p.textLink).text.trim().toLowerCase() : null)
        .filter((t): t is string => Boolean(t))
    ),
    [products],
  );

  const suggestions = useMemo(() => {
    if (!products) {
      return {
        country: [],
        cityDestination: [],
        tourType: [],
      };
    }
    const unique = (key: 'country' | 'cityDestination' | 'tourType') => [
      ...new Set(
        products
          .map((p) => p[key])
          .filter((v): v is string => Boolean(v)),
      ),
    ].sort();
    return {
      country: unique('country'),
      cityDestination: unique('cityDestination'),
      tourType: unique('tourType'),
    };
  }, [products]);

  function handleSaveComplete(old: WrittenProduct, updated: WrittenProduct) {
    const rowLabel =
      parseLinkField(old.textLink ?? '').text || old.textLink || `Row ${old.rowIndex}`;
    const changedFields = (Object.keys(updated) as (keyof WrittenProduct)[]).filter(
      (k) => k !== 'rowIndex' && updated[k] !== old[k],
    );
    const n = changedFields.length;
    if (n === 0) return;
    const oldRowIndex = old.rowIndex;
    const oldSnapshot = { ...old };
    const { rowIndex: _rowIndex, ...snapshot } = oldSnapshot;
    push({
      rowLabel,
      fieldLabel: n === 1 ? String(changedFields[0]) : `${n} fields`,
      oldValueDisplay: 'Previous version',
      newValueDisplay: 'Updated',
      revertPayload: { rowIndex: oldRowIndex, snapshot },
    });
  }

  async function handleRevert(record: EditRecord<WrittenProductPayload>) {
    try {
      await revert(record);
      toast.success('Reverted');
    } catch {
      toast.error('Revert failed, try again');
    }
  }

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

  const totalCount = products?.length ?? 0;
  const filteredCount = filteredProducts.length;

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Written Products
          </h1>
          <p className="mt-1 text-sm text-[hsl(var(--text-secondary))]">
            {isLoading
              ? 'Loading...'
              : `Showing ${filteredCount} of ${totalCount} written products`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setIsFullscreen(true)}
            aria-label="Enter fullscreen"
            title="Fullscreen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <EditHistoryPopover history={history} onRevert={handleRevert} />
          <WrittenProductExportButton products={filteredProducts} />
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Written Product
          </Button>
        </div>
      </div>

      <WrittenViewsBar
        activeViewId={activeViewId}
        customViews={customViews}
        onViewSelect={setActiveViewId}
        onViewDelete={handleViewDelete}
        onViewAdd={handleViewAdd}
      />

      <WrittenProductFilterBar
        allProducts={products ?? []}
        filters={filters}
        onFiltersChange={setFilters}
        titlesLoading={titlesLoading}
        trailing={
          !isLoading ? (
            <Badge variant="outline" className="shrink-0">
              {filteredCount} visible
            </Badge>
          ) : undefined
        }
      />

      <div
        className={cn(
          'flex min-h-0 flex-col overflow-hidden',
          isFullscreen
            ? 'fixed inset-0 z-40 bg-[hsl(var(--background))] flex-1'
            : 'flex-1',
        )}
      >
        {isFullscreen && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-3 right-3 z-10 h-7 w-7 p-0"
            onClick={() => setIsFullscreen(false)}
            aria-label="Exit fullscreen"
            title="Exit fullscreen (Esc)"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </Button>
        )}
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
        inProducts={
          editProduct
            ? productTitlesSet.has(parseLinkField(editProduct.textLink ?? '').text.toLowerCase())
            : false
        }
        suggestions={suggestions}
        onClose={() => setEditProduct(null)}
        onSaved={handleSaved}
        onSaveComplete={handleSaveComplete}
        onDelete={(p) => { setEditProduct(null); setDeleteProduct(p); }}
      />

      <Sheet open={createOpen} onOpenChange={(open) => { if (!open) setCreateOpen(false); }}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
          <SheetHeader className="px-6 py-5 border-b">
            <SheetTitle>Add Written Product</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <WrittenProductForm
              key={String(createOpen)}
              formId="add-written-product-form"
              hideActions
              suggestions={suggestions}
              onSubmit={handleCreate}
              onCancel={() => setCreateOpen(false)}
              isSubmitting={isCreating}
              existingTitles={existingTitles}
            />
          </div>
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button type="submit" form="add-written-product-form" size="sm" disabled={isCreating}>
              {isCreating ? 'Adding…' : 'Add'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

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
