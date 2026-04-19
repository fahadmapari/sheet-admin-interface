'use client';

import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowRight, CheckCircle2, ChevronDown, ChevronRight, Circle, Package, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, parseLinkField } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ASSEMBLY_STAGES, type AssemblyBatch, type AssemblyStage, type TourProduct } from '@/lib/types';

function getDaysInStage(batch: AssemblyBatch): number {
  const ref = batch.movedToStageAt ?? batch.createdAt;
  return (Date.now() - new Date(ref).getTime()) / 86_400_000;
}

interface BatchCardProps {
  batch: AssemblyBatch;
  products: TourProduct[];
  isMoving: boolean;
  movingProductRowIndex: number | null;
  isAdmin: boolean;
  readOnly?: boolean;
  onMoveToNextStage: (batch: AssemblyBatch) => Promise<void>;
  onMoveToStage: (batch: AssemblyBatch, targetStage: AssemblyStage) => Promise<void>;
  onMoveProductToNextStage: (product: TourProduct) => Promise<void>;
  onProductClick: (product: TourProduct) => void;
  onRemoveBatch: (batchId: string) => Promise<void>;
  onRemoveProduct: (rowIndex: number) => Promise<void>;
}

type PendingMove =
  | { type: 'batch'; targetStage: AssemblyStage; readyProducts: TourProduct[]; notReadyCount: number }
  | { type: 'product'; product: TourProduct; targetStage: AssemblyStage };

export function BatchCard({
  batch,
  products,
  isMoving,
  movingProductRowIndex,
  isAdmin,
  readOnly = false,
  onMoveToNextStage,
  onMoveToStage,
  onMoveProductToNextStage,
  onProductClick,
  onRemoveBatch,
  onRemoveProduct,
}: BatchCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [confirmRemoveBatch, setConfirmRemoveBatch] = useState(false);
  const [confirmRemoveProductRowIndex, setConfirmRemoveProductRowIndex] = useState<number | null>(null);

  const batchProducts = products.filter((p) =>
    batch.productRowIndexes.includes(p.rowIndex),
  );
  const stageIndex = ASSEMBLY_STAGES.indexOf(batch.stage);
  const nextStage = stageIndex >= 0 ? ASSEMBLY_STAGES[stageIndex + 1] : null;

  function isProductReady(product: TourProduct): boolean {
    switch (batch.stage) {
      case 'In Review':
        return !!product.isOk && product.isOk.trim() !== '';
      case '2nd Review':
        return !!product.ssOk;
      case 'Buying Price':
        return !!product.totalBuyingPrice && product.totalBuyingPrice.trim() !== '';
      case 'Selling Price':
        return (
          !!product.b2bPriceOnRequest &&
          product.b2bPriceOnRequest.trim() !== '' &&
          !!product.b2cPriceOnRequest &&
          product.b2cPriceOnRequest.trim() !== ''
        );
      case 'Ready for Upload':
        return !!product.productLink && product.productLink.trim() !== '';
      default:
        return false;
    }
  }

  const showReadiness = batch.stage !== 'Uploaded';

  const daysInStage = getDaysInStage(batch);
  const showStaleness = batch.stage !== 'Uploaded';

  const isForwardMove = (targetStage: AssemblyStage) =>
    ASSEMBLY_STAGES.indexOf(targetStage) > stageIndex;

  // Intercepts batch move: checks readiness only when moving forward
  const handleBatchMoveClick = (targetStage: AssemblyStage, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isForwardMove(targetStage)) {
      void onMoveToStage(batch, targetStage);
      return;
    }

    const readyProducts = batchProducts.filter(isProductReady);
    const notReadyCount = batchProducts.length - readyProducts.length;

    if (notReadyCount === 0) {
      // All ready — proceed directly
      if (targetStage === nextStage) {
        void onMoveToNextStage(batch);
      } else {
        void onMoveToStage(batch, targetStage);
      }
      return;
    }

    setPendingMove({ type: 'batch', targetStage, readyProducts, notReadyCount });
  };

  // Intercepts per-product move: checks readiness only when moving forward
  // (per-product move button always targets nextStage, which is always forward)
  const handleProductMoveClick = (product: TourProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!nextStage) return;

    if (isProductReady(product)) {
      void onMoveProductToNextStage(product);
      return;
    }

    setPendingMove({ type: 'product', product, targetStage: nextStage });
  };

  const confirmMove = async () => {
    if (!pendingMove) return;

    if (pendingMove.type === 'batch') {
      const { targetStage, readyProducts } = pendingMove;
      if (readyProducts.length > 0) {
        const filteredBatch: AssemblyBatch = {
          ...batch,
          productRowIndexes: readyProducts.map((p) => p.rowIndex),
        };
        if (targetStage === nextStage) {
          await onMoveToNextStage(filteredBatch);
        } else {
          await onMoveToStage(filteredBatch, targetStage);
        }
      }
    } else {
      await onMoveProductToNextStage(pendingMove.product);
    }

    setPendingMove(null);
  };

  const isNoneReady =
    pendingMove?.type === 'batch' && pendingMove.readyProducts.length === 0;

  return (
    <>
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
          {showStaleness && daysInStage >= 3 && (
            <span
              className={cn(
                'hidden text-xs font-medium sm:inline',
                daysInStage > 7 ? 'text-red-500' : 'text-yellow-600 dark:text-yellow-400',
              )}
            >
              {Math.floor(daysInStage)}d in stage
            </span>
          )}
          {(!showStaleness || daysInStage < 3) && (
            <span className="hidden text-xs text-[hsl(var(--text-tertiary))] sm:inline">
              {new Date(batch.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          )}
          <Badge variant="secondary" className="text-xs">
            {batch.productRowIndexes.length}
          </Badge>
          {nextStage && !readOnly ? (
            <div className="ml-2 flex">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-r-none border-r-0"
                disabled={isMoving}
                onClick={(e) => handleBatchMoveClick(nextStage, e)}
              >
                <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                {isMoving ? (
                  <>
                    <span className="sm:hidden">...</span>
                    <span className="hidden sm:inline">Moving...</span>
                  </>
                ) : (
                  <>
                    <span className="sm:hidden">Move</span>
                    <span className="hidden sm:inline">Move to {nextStage}</span>
                  </>
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-l-none px-2"
                    disabled={isMoving}
                    aria-label="Select stage for batch"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {ASSEMBLY_STAGES.map((stage) => (
                    <DropdownMenuItem
                      key={stage}
                      onClick={(e) => handleBatchMoveClick(stage, e)}
                    >
                      {stage}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}
          {isAdmin && !readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-1 h-8 w-8 text-[hsl(var(--text-tertiary))] hover:text-destructive"
              aria-label="Remove batch"
              onClick={(e) => { e.stopPropagation(); setConfirmRemoveBatch(true); }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {expanded && (
          <div className="border-t border-[hsl(var(--border))] px-4 py-2">
            {batchProducts.length === 0 ? (
              <p className="py-2 text-sm text-[hsl(var(--text-tertiary))]">No products loaded.</p>
            ) : (
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
                          {showReadiness && (
                            <td className="py-2 pl-3">
                              {isProductReady(product) ? (
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
                                onClick={(e) => handleProductMoveClick(product, e)}
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
                                onClick={(e) => { e.stopPropagation(); setConfirmRemoveProductRowIndex(product.rowIndex); }}
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
            )}
          </div>
        )}
      </div>

      {/* Remove batch confirmation */}
      <Dialog open={confirmRemoveBatch} onOpenChange={setConfirmRemoveBatch}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove batch</DialogTitle>
          </DialogHeader>
          <p className="py-2 text-sm text-[hsl(var(--text-secondary))]">
            Remove batch{' '}
            <span className="font-medium text-[hsl(var(--text-primary))]">&ldquo;{batch.name}&rdquo;</span>?{' '}
            All{' '}
            <span className="font-medium text-[hsl(var(--text-primary))]">{batch.productRowIndexes.length}</span>{' '}
            product{batch.productRowIndexes.length !== 1 ? 's' : ''} will be removed from assembly.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemoveBatch(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => { setConfirmRemoveBatch(false); void onRemoveBatch(batch._id); }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove product confirmation */}
      {confirmRemoveProductRowIndex !== null && (() => {
        const product = batchProducts.find((p) => p.rowIndex === confirmRemoveProductRowIndex);
        const linkParsed = product?.link ? parseLinkField(product.link) : null;
        const displayName = product
          ? product.productName || linkParsed?.text || product.link || `${product.city}, ${product.country}`
          : 'this product';
        return (
          <Dialog
            open={confirmRemoveProductRowIndex !== null}
            onOpenChange={(open) => { if (!open) setConfirmRemoveProductRowIndex(null); }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Remove product</DialogTitle>
              </DialogHeader>
              <p className="py-2 text-sm text-[hsl(var(--text-secondary))]">
                Remove{' '}
                <span className="font-medium text-[hsl(var(--text-primary))]">{displayName}</span>{' '}
                from assembly?
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmRemoveProductRowIndex(null)}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    const idx = confirmRemoveProductRowIndex;
                    setConfirmRemoveProductRowIndex(null);
                    void onRemoveProduct(idx);
                  }}
                >
                  Remove
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Readiness warning dialog */}
      <Dialog open={pendingMove !== null} onOpenChange={(open) => { if (!open) setPendingMove(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pendingMove?.type === 'product' ? 'Move product' : 'Move batch'}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 text-sm text-[hsl(var(--text-secondary))]">
            {pendingMove?.type === 'batch' && (
              isNoneReady ? (
                <p>
                  No products in this batch are ready to be moved to{' '}
                  <span className="font-medium text-[hsl(var(--text-primary))]">{pendingMove.targetStage}</span>.
                </p>
              ) : (
                <p>
                  <span className="font-medium text-[hsl(var(--text-primary))]">{pendingMove?.notReadyCount}</span>{' '}
                  product{pendingMove?.notReadyCount !== 1 ? 's are' : ' is'} not ready and will be skipped.
                  Only{' '}
                  <span className="font-medium text-[hsl(var(--text-primary))]">{pendingMove?.readyProducts.length}</span>{' '}
                  ready product{pendingMove?.readyProducts.length !== 1 ? 's' : ''} will be moved to{' '}
                  <span className="font-medium text-[hsl(var(--text-primary))]">{pendingMove?.targetStage}</span>.
                </p>
              )
            )}
            {pendingMove?.type === 'product' && (
              <p>
                This product is not ready for{' '}
                <span className="font-medium text-[hsl(var(--text-primary))]">{pendingMove.targetStage}</span>.
                Move it anyway?
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingMove(null)}>
              Cancel
            </Button>
            {!isNoneReady && (
              <Button onClick={() => void confirmMove()}>
                {pendingMove?.type === 'batch' ? 'Move ready products' : 'Move anyway'}
              </Button>
            )}
            {isNoneReady && (
              <Button variant="outline" onClick={() => setPendingMove(null)}>
                OK
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
