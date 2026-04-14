'use client';

import { useSearchParams } from 'next/navigation';
import { ProductsClient } from '@/app/(app)/products/products-client';
import {
  DEFAULT_FILTERS,
  MULTI_SELECT_FILTERS,
  PRESENCE_FILTERS,
  TRI_STATE_FILTERS,
  asPresenceState,
  asTriState,
  type Filters,
} from '@/lib/product-filters';

export function ProductsPageClient() {
  const searchParams = useSearchParams();
  const countries = searchParams.getAll('country');
  const cities = searchParams.getAll('city');
  const legacyCountry = searchParams.get('country');
  const legacyCity = searchParams.get('city');

  const initialFilters: Filters = { ...DEFAULT_FILTERS };
  const mutableInitialFilters = initialFilters as unknown as Record<string, unknown>;
  MULTI_SELECT_FILTERS.forEach(({ key, queryKey }) => {
    const values = searchParams.getAll(queryKey);
    if (Array.isArray(initialFilters[key])) {
      mutableInitialFilters[key] = values;
    }
  });
  initialFilters.country = countries.length > 0 ? countries : (legacyCountry ? [legacyCountry] : DEFAULT_FILTERS.country);
  initialFilters.city = cities.length > 0 ? cities : (legacyCity ? [legacyCity] : DEFAULT_FILTERS.city);
  TRI_STATE_FILTERS.forEach(({ key, queryKey }) => {
    mutableInitialFilters[key] = asTriState(searchParams.get(queryKey));
  });
  PRESENCE_FILTERS.forEach(({ key, queryKey }) => {
    mutableInitialFilters[key] = asPresenceState(searchParams.get(queryKey));
  });
  const initialSearch = searchParams.get('q') ?? '';

  return <ProductsClient initialFilters={initialFilters} initialSearch={initialSearch} />;
}
