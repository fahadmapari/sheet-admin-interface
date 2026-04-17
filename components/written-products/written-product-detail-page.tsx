// components/written-products/written-product-detail-page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { WrittenProductForm } from './written-product-form';
import type { WrittenProduct } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface WrittenProductDetailPageProps {
  product: WrittenProduct;
}

export function WrittenProductDetailPage({ product }: WrittenProductDetailPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: Omit<WrittenProduct, 'rowIndex'>) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/written-products/${product.rowIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Saved');
      router.push('/written-products');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 gap-1.5 text-sm"
        onClick={() => router.push('/written-products')}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </Button>
      <h1 className="text-sm font-medium mb-6 text-[hsl(var(--text-primary))] truncate">
        {product.textLink || 'Edit Written Product'}
      </h1>
      <WrittenProductForm
        initialData={product}
        onSubmit={handleSubmit}
        onCancel={() => router.push('/written-products')}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
