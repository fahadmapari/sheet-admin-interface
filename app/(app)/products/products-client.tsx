'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useSWR, { useSWRConfig } from 'swr';
import type { RowSelectionState, VisibilityState } from '@tanstack/react-table';
import { Plus, Search, X, LayoutGrid, Table2 } from 'lucide-react';
import { ProductTable } from '@/components/products/product-table';
import { ProductCards } from '@/components/products/product-cards';
import { ProductDetailSheet } from '@/components/products/product-detail-sheet';
import { FilterBar, DEFAULT_FILTERS, type Filters, type PresenceState, type TriState } from '@/components/products/filter-bar';
import { ViewsBar, type CustomView } from '@/components/products/views-bar';
import { useColumnGroups } from '@/lib/hooks/use-column-groups';
import { ProductForm } from '@/components/products/product-form';
import { BulkActionsToolbar } from '@/components/products/bulk-actions-toolbar';
import { DeleteConfirmDialog } from '@/components/products/delete-confirm-dialog';
import { ExportButton } from '@/components/products/export-button';
import { MoveToStageDialog } from '@/components/assembly/move-to-stage-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ASSEMBLY_STAGES } from '@/lib/types';
import type { TourProduct, AssemblyStage } from '@/lib/types';
import { fetcher } from '@/lib/fetcher';

type ViewMode = 'table' | 'cards';

const ARRAY_QUERY_KEYS: Array<{ filterKey: keyof Filters; queryKey: string }> = [
  { filterKey: 'country', queryKey: 'country' },
  { filterKey: 'city', queryKey: 'city' },
  { filterKey: 'departments', queryKey: 'department' },
  { filterKey: 'regions', queryKey: 'region' },
  { filterKey: 'productTypes', queryKey: 'type' },
  { filterKey: 'durations', queryKey: 'duration' },
  { filterKey: 'statuses', queryKey: 'status' },
  { filterKey: 'isOkValues', queryKey: 'isOkValue' },
  { filterKey: 'maxPaxValues', queryKey: 'maxPax' },
  { filterKey: 'guideWhereValues', queryKey: 'guideWhere' },
  { filterKey: 'transportationValues', queryKey: 'transportation' },
  { filterKey: 'vatValues', queryKey: 'vat' },
  { filterKey: 'vatPercentValues', queryKey: 'vatPercent' },
  { filterKey: 'cancellationValues', queryKey: 'cancellation' },
  { filterKey: 'pics', queryKey: 'pic' },
  { filterKey: 'uploadedPics', queryKey: 'uploadedPic' },
  { filterKey: 'otaMasterSheetValues', queryKey: 'otaMasterSheetValue' },
  { filterKey: 'otaTravmondeValues', queryKey: 'otaTravmondeValue' },
  { filterKey: 'otaBookableToursValues', queryKey: 'otaBookableToursValue' },
  { filterKey: 'otaViatorValues', queryKey: 'otaViatorValue' },
  { filterKey: 'otaGygValues', queryKey: 'otaGygValue' },
  { filterKey: 'otaHotelbedsValues', queryKey: 'otaHotelbedsValue' },
  { filterKey: 'otaProjectExpeditionValues', queryKey: 'otaProjectExpeditionValue' },
  { filterKey: 'otaAirbnbValues', queryKey: 'otaAirbnbValue' },
  { filterKey: 'otaBokunValues', queryKey: 'otaBokunValue' },
  { filterKey: 'otaTrekksoftValues', queryKey: 'otaTrekksoftValue' },
  { filterKey: 'otaTuiMusementValues', queryKey: 'otaTuiMusementValue' },
  { filterKey: 'otaKlookValues', queryKey: 'otaKlookValue' },
  { filterKey: 'otaToristyValues', queryKey: 'otaToristyValue' },
  { filterKey: 'otaTourHQValues', queryKey: 'otaTourHQValue' },
];

const TRI_STATE_QUERY_KEYS: Array<{ filterKey: keyof Filters; queryKey: string }> = [
  { filterKey: 'readyForUpload', queryKey: 'ready' },
  { filterKey: 'written', queryKey: 'written' },
  { filterKey: 'ssOk', queryKey: 'ssOk' },
  { filterKey: 'guide', queryKey: 'guide' },
  { filterKey: 'driver', queryKey: 'driver' },
  { filterKey: 'driverGuide', queryKey: 'driverGuide' },
  { filterKey: 'attractionIncluded', queryKey: 'attractionIncluded' },
  { filterKey: 'attractionOptional', queryKey: 'attractionOptional' },
];

const PRESENCE_QUERY_KEYS: Array<{ filterKey: keyof Filters; queryKey: string }> = [
  { filterKey: 'linkPresence', queryKey: 'link' },
  { filterKey: 'productNamePresence', queryKey: 'productName' },
  { filterKey: 'notesPresence', queryKey: 'notes' },
  { filterKey: 'isOkPresence', queryKey: 'isOk' },
  { filterKey: 'imageLinksPresence', queryKey: 'imageLinks' },
  { filterKey: 'componentsOfTourPresence', queryKey: 'componentsOfTour' },
  { filterKey: 'attractionsIncludedPresence', queryKey: 'attractionsIncluded' },
  { filterKey: 'attractionLinkPresence', queryKey: 'attractionLink' },
  { filterKey: 'providerPricePresence', queryKey: 'providerPrice' },
  { filterKey: 'providerUrlPresence', queryKey: 'providerUrl' },
  { filterKey: 'centralProviderLinksPresence', queryKey: 'centralProviderLinks' },
  { filterKey: 'centralTransportLinksPresence', queryKey: 'centralTransportLinks' },
  { filterKey: 'transportationPricePresence', queryKey: 'transportationPrice' },
  { filterKey: 'totalBuyingPricePresence', queryKey: 'totalBuyingPrice' },
  { filterKey: 'b2bPriceInstantPresence', queryKey: 'b2bPriceInstant' },
  { filterKey: 'b2bPriceOnRequestPresence', queryKey: 'b2bPriceOnRequest' },
  { filterKey: 'b2cPriceInstantPresence', queryKey: 'b2cPriceInstant' },
  { filterKey: 'b2cPriceOnRequestPresence', queryKey: 'b2cPriceOnRequest' },
  { filterKey: 'extraHrB2BInstantPresence', queryKey: 'extraHrB2BInstant' },
  { filterKey: 'extraHrB2BRequestPresence', queryKey: 'extraHrB2BRequest' },
  { filterKey: 'extraHrB2CInstantPresence', queryKey: 'extraHrB2CInstant' },
  { filterKey: 'extraHrB2CRequestPresence', queryKey: 'extraHrB2CRequest' },
  { filterKey: 'tourValidityGeneralPresence', queryKey: 'tourValidityGeneral' },
  { filterKey: 'tourValiditySpecificPresence', queryKey: 'tourValiditySpecific' },
  { filterKey: 'cancelInstantPresence', queryKey: 'cancelInstant' },
  { filterKey: 'cutoffInstantPresence', queryKey: 'cutoffInstant' },
  { filterKey: 'cancelOnRequestPresence', queryKey: 'cancelOnRequest' },
  { filterKey: 'cutoffOnRequestPresence', queryKey: 'cutoffOnRequest' },
  { filterKey: 'notesGeneralPresence', queryKey: 'notesGeneral' },
  { filterKey: 'otaMasterSheetPresence', queryKey: 'otaMasterSheet' },
  { filterKey: 'otaTravmondePresence', queryKey: 'otaTravmonde' },
  { filterKey: 'otaBookableToursPresence', queryKey: 'otaBookableTours' },
  { filterKey: 'otaViatorPresence', queryKey: 'otaViator' },
  { filterKey: 'otaGygPresence', queryKey: 'otaGyg' },
  { filterKey: 'otaHotelbedsPresence', queryKey: 'otaHotelbeds' },
  { filterKey: 'otaProjectExpeditionPresence', queryKey: 'otaProjectExpedition' },
  { filterKey: 'otaAirbnbPresence', queryKey: 'otaAirbnb' },
  { filterKey: 'otaBokunPresence', queryKey: 'otaBokun' },
  { filterKey: 'otaTrekksoftPresence', queryKey: 'otaTrekksoft' },
  { filterKey: 'otaTuiMusementPresence', queryKey: 'otaTuiMusement' },
  { filterKey: 'otaKlookPresence', queryKey: 'otaKlook' },
  { filterKey: 'otaToristyPresence', queryKey: 'otaToristy' },
  { filterKey: 'otaTourHQPresence', queryKey: 'otaTourHQ' },
  { filterKey: 'qualityRemarksPresence', queryKey: 'qualityRemarks' },
  { filterKey: 'dateOfDispatchPresence', queryKey: 'dateOfDispatch' },
  { filterKey: 'dateUploadedPresence', queryKey: 'dateUploaded' },
  { filterKey: 'productLinkPresence', queryKey: 'productLink' },
];

const ARRAY_FILTER_FIELDS: Array<{ filterKey: keyof Filters; productKey: keyof TourProduct }> = [
  { filterKey: 'country', productKey: 'country' },
  { filterKey: 'city', productKey: 'city' },
  { filterKey: 'departments', productKey: 'department' },
  { filterKey: 'regions', productKey: 'region' },
  { filterKey: 'productTypes', productKey: 'productType' },
  { filterKey: 'durations', productKey: 'duration' },
  { filterKey: 'statuses', productKey: 'productStatus' },
  { filterKey: 'isOkValues', productKey: 'isOk' },
  { filterKey: 'maxPaxValues', productKey: 'maxPax' },
  { filterKey: 'guideWhereValues', productKey: 'guideWhere' },
  { filterKey: 'transportationValues', productKey: 'transportation' },
  { filterKey: 'vatValues', productKey: 'vatYN' },
  { filterKey: 'vatPercentValues', productKey: 'vatPercent' },
  { filterKey: 'cancellationValues', productKey: 'cancellation' },
  { filterKey: 'pics', productKey: 'pic' },
  { filterKey: 'uploadedPics', productKey: 'uploadedPic' },
  { filterKey: 'otaMasterSheetValues', productKey: 'otaMasterSheet' },
  { filterKey: 'otaTravmondeValues', productKey: 'otaTravmonde' },
  { filterKey: 'otaBookableToursValues', productKey: 'otaBookableTours' },
  { filterKey: 'otaViatorValues', productKey: 'otaViator' },
  { filterKey: 'otaGygValues', productKey: 'otaGyg' },
  { filterKey: 'otaHotelbedsValues', productKey: 'otaHotelbeds' },
  { filterKey: 'otaProjectExpeditionValues', productKey: 'otaProjectExpedition' },
  { filterKey: 'otaAirbnbValues', productKey: 'otaAirbnb' },
  { filterKey: 'otaBokunValues', productKey: 'otaBokun' },
  { filterKey: 'otaTrekksoftValues', productKey: 'otaTrekksoft' },
  { filterKey: 'otaTuiMusementValues', productKey: 'otaTuiMusement' },
  { filterKey: 'otaKlookValues', productKey: 'otaKlook' },
  { filterKey: 'otaToristyValues', productKey: 'otaToristy' },
  { filterKey: 'otaTourHQValues', productKey: 'otaTourHQ' },
];

const TRI_STATE_FILTER_FIELDS: Array<{ filterKey: keyof Filters; productKey: keyof TourProduct }> = [
  { filterKey: 'readyForUpload', productKey: 'readyForUpload' },
  { filterKey: 'written', productKey: 'written' },
  { filterKey: 'ssOk', productKey: 'ssOk' },
  { filterKey: 'guide', productKey: 'guide' },
  { filterKey: 'driver', productKey: 'driver' },
  { filterKey: 'driverGuide', productKey: 'driverGuide' },
  { filterKey: 'attractionIncluded', productKey: 'attractionIncluded' },
  { filterKey: 'attractionOptional', productKey: 'attractionOptional' },
];

const PRESENCE_FILTER_FIELDS: Array<{ filterKey: keyof Filters; productKey: keyof TourProduct }> = [
  { filterKey: 'linkPresence', productKey: 'link' },
  { filterKey: 'productNamePresence', productKey: 'productName' },
  { filterKey: 'notesPresence', productKey: 'notes' },
  { filterKey: 'isOkPresence', productKey: 'isOk' },
  { filterKey: 'imageLinksPresence', productKey: 'imageLinks' },
  { filterKey: 'componentsOfTourPresence', productKey: 'componentsOfTour' },
  { filterKey: 'attractionsIncludedPresence', productKey: 'attractionsIncluded' },
  { filterKey: 'attractionLinkPresence', productKey: 'attractionLink' },
  { filterKey: 'providerPricePresence', productKey: 'providerPrice' },
  { filterKey: 'providerUrlPresence', productKey: 'providerUrl' },
  { filterKey: 'centralProviderLinksPresence', productKey: 'centralProviderLinks' },
  { filterKey: 'centralTransportLinksPresence', productKey: 'centralTransportLinks' },
  { filterKey: 'transportationPricePresence', productKey: 'transportationPrice' },
  { filterKey: 'totalBuyingPricePresence', productKey: 'totalBuyingPrice' },
  { filterKey: 'b2bPriceInstantPresence', productKey: 'b2bPriceInstant' },
  { filterKey: 'b2bPriceOnRequestPresence', productKey: 'b2bPriceOnRequest' },
  { filterKey: 'b2cPriceInstantPresence', productKey: 'b2cPriceInstant' },
  { filterKey: 'b2cPriceOnRequestPresence', productKey: 'b2cPriceOnRequest' },
  { filterKey: 'extraHrB2BInstantPresence', productKey: 'extraHrB2BInstant' },
  { filterKey: 'extraHrB2BRequestPresence', productKey: 'extraHrB2BRequest' },
  { filterKey: 'extraHrB2CInstantPresence', productKey: 'extraHrB2CInstant' },
  { filterKey: 'extraHrB2CRequestPresence', productKey: 'extraHrB2CRequest' },
  { filterKey: 'tourValidityGeneralPresence', productKey: 'tourValidityGeneral' },
  { filterKey: 'tourValiditySpecificPresence', productKey: 'tourValiditySpecific' },
  { filterKey: 'cancelInstantPresence', productKey: 'cancelInstant' },
  { filterKey: 'cutoffInstantPresence', productKey: 'cutoffInstant' },
  { filterKey: 'cancelOnRequestPresence', productKey: 'cancelOnRequest' },
  { filterKey: 'cutoffOnRequestPresence', productKey: 'cutoffOnRequest' },
  { filterKey: 'notesGeneralPresence', productKey: 'notesGeneral' },
  { filterKey: 'otaMasterSheetPresence', productKey: 'otaMasterSheet' },
  { filterKey: 'otaTravmondePresence', productKey: 'otaTravmonde' },
  { filterKey: 'otaBookableToursPresence', productKey: 'otaBookableTours' },
  { filterKey: 'otaViatorPresence', productKey: 'otaViator' },
  { filterKey: 'otaGygPresence', productKey: 'otaGyg' },
  { filterKey: 'otaHotelbedsPresence', productKey: 'otaHotelbeds' },
  { filterKey: 'otaProjectExpeditionPresence', productKey: 'otaProjectExpedition' },
  { filterKey: 'otaAirbnbPresence', productKey: 'otaAirbnb' },
  { filterKey: 'otaBokunPresence', productKey: 'otaBokun' },
  { filterKey: 'otaTrekksoftPresence', productKey: 'otaTrekksoft' },
  { filterKey: 'otaTuiMusementPresence', productKey: 'otaTuiMusement' },
  { filterKey: 'otaKlookPresence', productKey: 'otaKlook' },
  { filterKey: 'otaToristyPresence', productKey: 'otaToristy' },
  { filterKey: 'otaTourHQPresence', productKey: 'otaTourHQ' },
  { filterKey: 'qualityRemarksPresence', productKey: 'qualityRemarks' },
  { filterKey: 'dateOfDispatchPresence', productKey: 'dateOfDispatch' },
  { filterKey: 'dateUploadedPresence', productKey: 'dateUploaded' },
  { filterKey: 'productLinkPresence', productKey: 'productLink' },
];

function hasValue(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return !Number.isNaN(value);
  return typeof value === 'string' ? value.trim() !== '' : value !== null && value !== undefined;
}

function matchesMulti(value: unknown, selected: unknown) {
  if (!Array.isArray(selected) || selected.length === 0) return true;
  return selected.includes(value === null || value === undefined ? '' : String(value));
}

function matchesTriState(value: unknown, filter: unknown) {
  if (filter === 'all') return true;
  return filter === 'yes' ? Boolean(value) : !Boolean(value);
}

function matchesPresence(value: unknown, filter: unknown) {
  if (filter === 'all') return true;
  const present = hasValue(value);
  return filter === 'has' ? present : !present;
}

interface ProductsClientProps {
  initialFilters?: Filters;
  initialSearch?: string;
}

export function ProductsClient({ initialFilters, initialSearch }: ProductsClientProps = {}) {
  const router = useRouter();
  const pathname = usePathname();

  const [activeView, setActiveView] = useState<ViewMode>('table');

  // Avoid SSR mismatch: check viewport on client mount only
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setActiveView(e.matches ? 'cards' : 'table');
    if (mql.matches) setActiveView('cards');
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const [filters, setFilters] = useState<Filters>(initialFilters ?? DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState(initialSearch ?? '');
  const [globalSearch, setGlobalSearch] = useState(initialSearch ?? '');
  const [addOpen, setAddOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [deleteTarget, setDeleteTarget] = useState<TourProduct | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<TourProduct | null>(null);
  const [singleMoveDialogOpen, setSingleMoveDialogOpen] = useState(false);
  const [singleMoveProduct, setSingleMoveProduct] = useState<TourProduct | null>(null);
  const [activeViewId, setActiveViewId] = useState<string>('default');
  const [customViews, setCustomViews] = useState<CustomView[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sheet-admin:custom-views');
      if (stored) setCustomViews(JSON.parse(stored) as CustomView[]);
    } catch (e) {
      console.warn('sheet-admin: failed to parse custom-views from localStorage', e);
    }
  }, []);
  const selectedProductRowIndex = selectedProduct?.rowIndex ?? null;

  const updateUrl = useCallback((newFilters: Filters, newSearch: string) => {
    const params = new URLSearchParams();
    ARRAY_QUERY_KEYS.forEach(({ filterKey, queryKey }) => {
      const values = newFilters[filterKey];
      if (Array.isArray(values)) {
        values.forEach((value) => params.append(queryKey, value));
      }
    });
    TRI_STATE_QUERY_KEYS.forEach(({ filterKey, queryKey }) => {
      const value = newFilters[filterKey] as TriState;
      if (value !== 'all') params.set(queryKey, value);
    });
    PRESENCE_QUERY_KEYS.forEach(({ filterKey, queryKey }) => {
      const value = newFilters[filterKey] as PresenceState;
      if (value !== 'all') params.set(queryKey, value);
    });
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
      for (const { filterKey, productKey } of ARRAY_FILTER_FIELDS) {
        if (!matchesMulti(p[productKey], filters[filterKey])) return false;
      }
      for (const { filterKey, productKey } of TRI_STATE_FILTER_FIELDS) {
        if (!matchesTriState(p[productKey], filters[filterKey])) return false;
      }
      for (const { filterKey, productKey } of PRESENCE_FILTER_FIELDS) {
        if (!matchesPresence(p[productKey], filters[filterKey])) return false;
      }
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

  const { groups: columnGroups } = useColumnGroups();
  const allFieldIds = useMemo(
    () => columnGroups.flatMap((g) => g.fields),
    [columnGroups]
  );

  const columnVisibility = useMemo((): VisibilityState => {
    const base: VisibilityState = Object.fromEntries(allFieldIds.map((id) => [id, false]));

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
      ...Object.fromEntries(allFieldIds.map((id) => [id, cols.has(id)])),
    };
  }, [activeViewId, customViews, allFieldIds]);

  const handleViewAdd = useCallback((view: CustomView) => {
    const next = [...customViews, view];
    setCustomViews(next);
    localStorage.setItem('sheet-admin:custom-views', JSON.stringify(next));
    setActiveViewId(view.id);
  }, [customViews]);

  const handleViewDelete = useCallback((id: string) => {
    const next = customViews.filter((v) => v.id !== id);
    setCustomViews(next);
    localStorage.setItem('sheet-admin:custom-views', JSON.stringify(next));
    if (activeViewId === id) setActiveViewId('default');
  }, [customViews, activeViewId]);

  const handleMoveToNextStage = useCallback(async (product: TourProduct) => {
    const res = await fetch(`/api/assembly/product/${product.rowIndex}`);
    const info = res.ok ? await res.json() : null;

    const currentStage = info?.stage as AssemblyStage | undefined;
    if (!currentStage) {
      setSingleMoveProduct(product);
      setSingleMoveDialogOpen(true);
      return;
    }

    const currentIndex = currentStage ? ASSEMBLY_STAGES.indexOf(currentStage) : -1;
    const nextStage: AssemblyStage =
      currentIndex === -1 || currentIndex >= ASSEMBLY_STAGES.length - 1
        ? ASSEMBLY_STAGES[0]
        : ASSEMBLY_STAGES[currentIndex + 1];

    const moveRes = await fetch('/api/assembly/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rowIndexes: [product.rowIndex],
        targetStage: nextStage,
        batchStrategy: { type: 'new' },
      }),
    });

    if (moveRes.ok) {
      toast.success(`Moved to "${nextStage}"`);
      if (nextStage === 'Ready for Upload') {
        mutate('/api/products');
      }
    } else {
      toast.error('Move failed');
    }
  }, [mutate]);

  const handleSingleMoveConfirm = useCallback(async (
    strategy: { type: 'new'; name: string } | { type: 'existing'; batchId: string },
  ) => {
    if (!singleMoveProduct) return;

    const targetStage = ASSEMBLY_STAGES[0];
    const moveRes = await fetch('/api/assembly/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rowIndexes: [singleMoveProduct.rowIndex],
        targetStage,
        batchStrategy: strategy,
      }),
    });

    if (moveRes.ok) {
      toast.success(`Moved to "${targetStage}"`);
      setSingleMoveProduct(null);
    } else {
      toast.error('Move failed');
      throw new Error('Move failed');
    }
  }, [singleMoveProduct]);

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
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--text-tertiary))]" />
          <Input
            className="w-full pl-8 pr-8"
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
        {!isLoading && (
          <Badge variant="outline" className="shrink-0">{filteredCount} visible</Badge>
        )}
      </div>

      <FilterBar filters={filters} onFiltersChange={setFilters} />

      {activeView === 'table' && (
        <BulkActionsToolbar
          selectedProducts={selectedProducts}
          onClearSelection={() => setRowSelection({})}
          onMutate={() => mutate('/api/products')}
        />
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
            onMoveToNextStage={handleMoveToNextStage}
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
      <MoveToStageDialog
        open={singleMoveDialogOpen}
        onOpenChange={(open) => {
          setSingleMoveDialogOpen(open);
          if (!open) setSingleMoveProduct(null);
        }}
        targetStage={ASSEMBLY_STAGES[0]}
        onConfirm={handleSingleMoveConfirm}
      />
    </div>
  );
}
