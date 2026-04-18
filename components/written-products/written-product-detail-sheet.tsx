// components/written-products/written-product-detail-sheet.tsx
'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ExternalLink, Plus } from 'lucide-react';
import { WrittenProductForm } from './written-product-form';
import { ProductForm } from '@/components/products/product-form';
import type { WrittenProduct } from '@/lib/types';
import { parseLinkField } from '@/lib/utils';
import { toast } from 'sonner';

const FORM_ID = 'written-product-detail-form';

function buildProductDefaults(wp: WrittenProduct) {
  const { text, url } = parseLinkField(wp.textLink ?? '');
  return {
    country: wp.country ?? '',
    city: wp.cityDestination ?? '',
    productType: wp.tourType ?? '',
    linkTitle: text ?? '',
    linkUrl: url ?? '',
  };
}

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
  const [addProductOpen, setAddProductOpen] = useState(false);

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
    <>
      <Sheet open={product !== null} onOpenChange={(open) => { if (!open) { setAddProductOpen(false); onClose(); } }}>
        <SheetContent className="w-[600px] sm:max-w-[600px] p-0 flex flex-col">
          <div className="border-b border-[hsl(var(--border))] px-6 py-5">
            <SheetTitle className="text-sm font-medium truncate min-w-0">
              {product?.textLink ? (() => {
                const { text, url } = parseLinkField(product.textLink);
                const displayName = text || url || product.textLink;
                return (
                  <span className="inline-flex items-center gap-1.5">
                    {displayName}
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))] transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </span>
                );
              })() : 'Edit Written Product'}
            </SheetTitle>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {product && (
              <WrittenProductForm
                formId={FORM_ID}
                hideActions
                initialData={product}
                onSubmit={handleSubmit}
                onCancel={onClose}
                onDelete={() => onDelete(product)}
                isSubmitting={isSubmitting}
              />
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-[hsl(var(--border))] px-6 py-4">
            <div>
              {product && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(product)}
                  disabled={isSubmitting}
                >
                  Delete
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {product && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setAddProductOpen(true)}
                  disabled={isSubmitting}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add to Products
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" form={FORM_ID} size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      {product && (
        <ProductForm
          open={addProductOpen}
          onClose={() => setAddProductOpen(false)}
          defaultValues={buildProductDefaults(product)}
          written
        />
      )}
    </>
  );
}
