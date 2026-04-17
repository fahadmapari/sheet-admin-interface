// components/written-products/written-product-detail-sheet.tsx
'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { WrittenProductForm } from './written-product-form';
import type { WrittenProduct } from '@/lib/types';
import { toast } from 'sonner';

interface WrittenProductDetailSheetProps {
  product: WrittenProduct | null;
  onClose: () => void;
  onSaved: (updated: WrittenProduct) => void;
  onDelete: (product: WrittenProduct) => void;
}

export function WrittenProductDetailSheet({
  product,
  onClose,
  onSaved,
  onDelete,
}: WrittenProductDetailSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: Omit<WrittenProduct, 'rowIndex'>) {
    if (!product) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/written-products/${product.rowIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated: WrittenProduct = await res.json();
      onSaved(updated);
      toast.success('Saved');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={product !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-sm font-medium truncate pr-4">
            {product?.textLink || 'Edit Written Product'}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          {product && (
            <WrittenProductForm
              initialData={product}
              onSubmit={handleSubmit}
              onCancel={onClose}
              onDelete={() => onDelete(product)}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
