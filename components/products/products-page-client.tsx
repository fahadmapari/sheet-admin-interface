'use client';

import { useSearchParams } from 'next/navigation';
import { ProductsClient } from '@/app/products/products-client';
import { DEFAULT_FILTERS, type Filters } from '@/components/products/filter-bar';

export function ProductsPageClient() {
  const searchParams = useSearchParams();
  const countries = searchParams.getAll('country');
  const cities = searchParams.getAll('city');
  const legacyCountry = searchParams.get('country');
  const legacyCity = searchParams.get('city');

  const initialFilters: Filters = {
    country: countries.length > 0 ? countries : (legacyCountry ? [legacyCountry] : DEFAULT_FILTERS.country),
    city: cities.length > 0 ? cities : (legacyCity ? [legacyCity] : DEFAULT_FILTERS.city),
    productTypes: searchParams.getAll('type'),
    statuses: searchParams.getAll('status'),
    readyForUpload: (searchParams.get('ready') ?? 'all') as 'all' | 'yes' | 'no',
  };
  const initialSearch = searchParams.get('q') ?? '';

  return <ProductsClient initialFilters={initialFilters} initialSearch={initialSearch} />;
}
