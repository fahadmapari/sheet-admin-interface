'use client';

import { ArrowRight, CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, parseLinkField } from '@/lib/utils';
import { isProductReady } from './batch-helpers';
import type { AssemblyBatch, AssemblyStage, TourProduct } from '@/lib/types';

interface BatchProductsTableProps {
  batch: AssemblyBatch;
  products: TourProduct[];
  isAdmin: boolean;
  readOnly: boolean;
  movingProductRowIndex: number | null;
  isMoving: boolean;
  nextStage: AssemblyStage | null;
  showReadiness: boolean;
  onProductClick: (product: TourProduct) => void;
  onProductMoveClick: (product: TourProduct, e: React.MouseEvent) => void;
  onRemoveProductClick: (rowIndex: number) => void;
}

export function BatchProductsTable({
  batch,
  products,
  isAdmin,
  readOnly,
  movingProductRowIndex,
  isMoving,
  nextStage,
  showReadiness,
  onProductClick,
  onProductMoveClick,
  onRemoveProductClick,
}: BatchProductsTableProps) {
  const batchProducts = products.filter((p) =>
    batch.productRowIndexes.includes(p.rowIndex),
  );

  if (batchProducts.length === 0) {
    return <p className="py-2 text-sm text-[hsl(var(--text-tertiary))]">No products loaded.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
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
            {showReadiness && (
              <th className="py-1.5 pl-3 text-left text-xs font-medium text-[hsl(var(--text-tertiary))]">
                Ready
              </th>
            )}
            {nextStage && !readOnly && (
              <th className="py-1.5 pl-3 text-right text-xs font-medium text-[hsl(var(--text-tertiary))]">
                Move
              </th>
            )}
            {isAdmin && !readOnly && (
              <th className="py-1.5 pl-2 text-right text-xs font-medium text-[hsl(var(--text-tertiary))]" />
            )}
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
            const isThisProductMoving = movingProductRowIndex === product.rowIndex;

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
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="truncate block">{displayName}</span>
                      </TooltipTrigger>
                      <TooltipContent>{displayName}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </td>
                <td className="py-2 pr-4 text-[hsl(var(--text-secondary))]">{product.city}</td>
                <td className="py-2 pr-4 text-[hsl(var(--text-secondary))]">{product.country}</td>
                <td className="py-2">
                  {product.productStatus ? (
                    <Badge variant="outline" className="text-xs">
                      {product.productStatus}
                    </Badge>
                  ) : (
                    <span className="text-[hsl(var(--text-tertiary))]">-</span>
                  )}
                </td>
                {showReadiness && (
                  <td className="py-2 pl-3">
                    {isProductReady(product, batch.stage) ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-[hsl(var(--text-tertiary))] opacity-40" />
                    )}
                  </td>
                )}
                {nextStage && !readOnly && (
                  <td className="py-2 pl-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      disabled={isThisProductMoving || isMoving}
                      onClick={(e) => onProductMoveClick(product, e)}
                    >
                      <ArrowRight className="mr-1 h-3 w-3" />
                      {isThisProductMoving ? '...' : 'Move'}
                    </Button>
                  </td>
                )}
                {isAdmin && !readOnly && (
                  <td className="py-2 pl-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-[hsl(var(--text-tertiary))] hover:text-destructive"
                      aria-label="Remove product from assembly"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveProductClick(product.rowIndex);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
