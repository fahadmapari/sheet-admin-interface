'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AssemblyBatch, TourProduct } from '@/lib/types';

interface BatchCardProps {
  batch: AssemblyBatch;
  products: TourProduct[];
  onProductClick: (product: TourProduct) => void;
}

export function BatchCard({ batch, products, onProductClick }: BatchCardProps) {
  const [expanded, setExpanded] = useState(false);

  const batchProducts = products.filter((p) =>
    batch.productRowIndexes.includes(p.rowIndex),
  );

  const dateLabel = new Date(batch.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]">
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[hsl(var(--surface))] transition-colors rounded-lg"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-[hsl(var(--text-tertiary))]" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--text-tertiary))]" />
        )}
        <Package className="h-4 w-4 shrink-0 text-[hsl(var(--text-secondary))]" />
        <span className="flex-1 text-sm font-medium text-[hsl(var(--text-primary))]">
          {batch.name}
        </span>
        <span className="text-xs text-[hsl(var(--text-tertiary))]">{dateLabel}</span>
        <Badge variant="secondary" className="ml-2 text-xs">
          {batch.productRowIndexes.length}
        </Badge>
      </button>

      {expanded && (
        <div className="border-t border-[hsl(var(--border))] px-4 py-2">
          {batchProducts.length === 0 ? (
            <p className="py-2 text-sm text-[hsl(var(--text-tertiary))]">No products loaded.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  <th className="py-1.5 text-left text-xs font-medium text-[hsl(var(--text-tertiary))] pr-4">Product</th>
                  <th className="py-1.5 text-left text-xs font-medium text-[hsl(var(--text-tertiary))] pr-4">City</th>
                  <th className="py-1.5 text-left text-xs font-medium text-[hsl(var(--text-tertiary))] pr-4">Country</th>
                  <th className="py-1.5 text-left text-xs font-medium text-[hsl(var(--text-tertiary))]">Status</th>
                </tr>
              </thead>
              <tbody>
                {batchProducts.map((product) => (
                  <tr
                    key={product.rowIndex}
                    className={cn(
                      'cursor-pointer border-b border-[hsl(var(--border))] last:border-0',
                      'hover:bg-[hsl(var(--surface))] transition-colors',
                    )}
                    onClick={() => onProductClick(product)}
                  >
                    <td className="py-2 pr-4 font-medium text-[hsl(var(--text-primary))] max-w-[220px] truncate">
                      {product.productName || `${product.city}, ${product.country}`}
                    </td>
                    <td className="py-2 pr-4 text-[hsl(var(--text-secondary))]">{product.city}</td>
                    <td className="py-2 pr-4 text-[hsl(var(--text-secondary))]">{product.country}</td>
                    <td className="py-2">
                      {product.productStatus ? (
                        <Badge variant="outline" className="text-xs">{product.productStatus}</Badge>
                      ) : (
                        <span className="text-[hsl(var(--text-tertiary))]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
