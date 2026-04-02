'use client';

import { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronRight, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, parseLinkField } from '@/lib/utils';
import { ASSEMBLY_STAGES, type AssemblyBatch, type TourProduct } from '@/lib/types';

interface BatchCardProps {
  batch: AssemblyBatch;
  products: TourProduct[];
  isMoving: boolean;
  onMoveToNextStage: (batch: AssemblyBatch) => Promise<void>;
  onProductClick: (product: TourProduct) => void;
}

export function BatchCard({
  batch,
  products,
  isMoving,
  onMoveToNextStage,
  onProductClick,
}: BatchCardProps) {
  const [expanded, setExpanded] = useState(false);

  const batchProducts = products.filter((p) =>
    batch.productRowIndexes.includes(p.rowIndex),
  );
  const stageIndex = ASSEMBLY_STAGES.indexOf(batch.stage);
  const nextStage = stageIndex >= 0 ? ASSEMBLY_STAGES[stageIndex + 1] : null;

  const dateLabel = new Date(batch.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]">
      <div className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-[hsl(var(--surface))]">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-[hsl(var(--text-tertiary))]" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--text-tertiary))]" />
          )}
          <Package className="h-4 w-4 shrink-0 text-[hsl(var(--text-secondary))]" />
          <span className="flex-1 truncate text-sm font-medium text-[hsl(var(--text-primary))]">
            {batch.name}
          </span>
        </button>
        <span className="text-xs text-[hsl(var(--text-tertiary))]">{dateLabel}</span>
        <Badge variant="secondary" className="text-xs">
          {batch.productRowIndexes.length}
        </Badge>
        {nextStage ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-2 h-8"
            disabled={isMoving}
            onClick={(event) => {
              event.stopPropagation();
              void onMoveToNextStage(batch);
            }}
          >
            <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
            {isMoving ? 'Moving...' : `Move to ${nextStage}`}
          </Button>
        ) : null}
      </div>

      {expanded && (
        <div className="border-t border-[hsl(var(--border))] px-4 py-2">
          {batchProducts.length === 0 ? (
            <p className="py-2 text-sm text-[hsl(var(--text-tertiary))]">No products loaded.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  <th className="py-1.5 pr-4 text-left text-xs font-medium text-[hsl(var(--text-tertiary))]">
                    Product
                  </th>
                  <th className="py-1.5 pr-4 text-left text-xs font-medium text-[hsl(var(--text-tertiary))]">
                    City
                  </th>
                  <th className="py-1.5 pr-4 text-left text-xs font-medium text-[hsl(var(--text-tertiary))]">
                    Country
                  </th>
                  <th className="py-1.5 text-left text-xs font-medium text-[hsl(var(--text-tertiary))]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {batchProducts.map((product) => {
                  const linkParsed = product.link ? parseLinkField(product.link) : null;
                  const displayName =
                    product.productName ||
                    linkParsed?.text ||
                    product.link ||
                    `${product.city}, ${product.country}`;

                  return (
                    <tr
                      key={product.rowIndex}
                      className={cn(
                        'cursor-pointer border-b border-[hsl(var(--border))] last:border-0',
                        'transition-colors hover:bg-[hsl(var(--surface))]',
                      )}
                      onClick={() => onProductClick(product)}
                    >
                      <td className="max-w-[220px] truncate py-2 pr-4 font-medium text-[hsl(var(--text-primary))]">
                        {displayName}
                      </td>
                      <td className="py-2 pr-4 text-[hsl(var(--text-secondary))]">{product.city}</td>
                      <td className="py-2 pr-4 text-[hsl(var(--text-secondary))]">
                        {product.country}
                      </td>
                      <td className="py-2">
                        {product.productStatus ? (
                          <Badge variant="outline" className="text-xs">
                            {product.productStatus}
                          </Badge>
                        ) : (
                          <span className="text-[hsl(var(--text-tertiary))]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
