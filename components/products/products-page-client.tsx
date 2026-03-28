'use client';

import { useSearchParams } from 'next/navigation';
import { ProductsClient } from '@/app/products/products-client';
import { DEFAULT_FILTERS, type Filters } from '@/components/products/filter-bar';

export function ProductsPageClient() {
  const searchParams = useSearchParams();

  const initialFilters: Filters = {
    country: searchParams.get('country') ?? DEFAULT_FILTERS.country,
    city: searchParams.get('city') ?? DEFAULT_FILTERS.city,
    productTypes: searchParams.getAll('type'),
    statuses: searchParams.getAll('status'),
    pics: searchParams.getAll('pic'),
    readyForUpload: (searchParams.get('ready') ?? 'all') as 'all' | 'yes' | 'no',
  };
  const initialSearch = searchParams.get('q') ?? '';

  return <ProductsClient initialFilters={initialFilters} initialSearch={initialSearch} />;
}
