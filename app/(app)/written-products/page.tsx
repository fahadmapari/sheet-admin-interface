// app/(app)/written-products/page.tsx
import { Suspense } from 'react';
import { WrittenProductsClient } from './written-products-client';

export default function WrittenProductsPage() {
  return (
    <Suspense fallback={null}>
      <WrittenProductsClient />
    </Suspense>
  );
}
