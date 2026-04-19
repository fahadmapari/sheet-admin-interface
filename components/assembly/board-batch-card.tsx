'use client';

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  GripVertical,
  Package,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import { BatchProductsTable } from './batch-products-table';
import { getDaysInStage, isProductReady } from './batch-helpers';
import {
  ASSEMBLY_STAGES,
  type AssemblyBatch,
  type AssemblyStage,
  type TourProduct,
} from '@/lib/types';

interface BoardBatchCardProps {
  batch: AssemblyBatch;
  products: TourProduct[];
  isAdmin: boolean;
  isMoving: boolean;
  movingProductRowIndex: number | null;
  onRequestMove: (batch: AssemblyBatch, targetStage: AssemblyStage) => void;
  onMoveProductToNextStage: (product: TourProduct, batch: AssemblyBatch) => Promise<void>;
  onProductClick: (product: TourProduct) => void;
  onRemoveBatch: (batchId: string) => Promise<void>;
  onRemoveProduct: (rowIndex: number) => Promise<void>;
}

export function BoardBatchCard({
  batch,
  products,
  isAdmin,
  isMoving,
  movingProductRowIndex,
  onRequestMove,
  onMoveProductToNextStage,
  onProductClick,
  onRemoveBatch,
  onRemoveProduct,
}: BoardBatchCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmRemoveBatch, setConfirmRemoveBatch] = useState(false);
  const [confirmRemoveProductRowIndex, setConfirmRemoveProductRowIndex] = useState<number | null>(
    null,
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: batch._id,
    data: { batch, sourceStage: batch.stage },
  });

  const batchProducts = products.filter((p) => batch.productRowIndexes.includes(p.rowIndex));
  const stageIndex = ASSEMBLY_STAGES.indexOf(batch.stage);
  const nextStage = stageIndex >= 0 ? ASSEMBLY_STAGES[stageIndex + 1] ?? null : null;
  const readyCount = batchProducts.filter((p) => isProductReady(p, batch.stage)).length;
  const totalCount = batchProducts.length;
  const daysInStage = getDaysInStage(batch);
  const showStaleness = batch.stage !== 'Uploaded';
  const showReadiness = batch.stage !== 'Uploaded';

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }
    : undefined;

  // Per-product intercept: open dialog via onMoveProductToNextStage wrapper in parent? Board's readiness
  // dialog is at batch level only. Per-product moves always go forward; match list-view behavior by
  // firing move immediately when ready, otherwise show a local dialog.
  const handleProductMoveClick = (product: TourProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!nextStage) return;
    if (isProductReady(product, batch.stage)) {
      void onMoveProductToNextStage(product, batch);
      return;
    }
    setPendingProductMove({ product, targetStage: nextStage });
  };

  const [pendingProductMove, setPendingProductMove] = useState<{
    product: TourProduct;
    targetStage: AssemblyStage;
  } | null>(null);

  const confirmProductMove = async () => {
    if (!pendingProductMove) return;
    await onMoveProductToNextStage(pendingProductMove.product, batch);
    setPendingProductMove(null);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-sm',
          'transition-shadow hover:shadow-md',
          isDragging && 'ring-2 ring-primary',
        )}
      >
        {/* Drag handle + card head */}
        <div className="flex items-start gap-2 px-3 pt-3">
          <button
            type="button"
            className="mt-0.5 cursor-grab touch-none text-[hsl(var(--text-tertiary))] active:cursor-grabbing"
            aria-label={`Drag batch ${batch.name}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Package className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--text-secondary))]" />
          <span className="flex-1 break-words text-sm font-medium text-[hsl(var(--text-primary))]">
            {batch.name}
          </span>
          {isAdmin && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-[hsl(var(--text-tertiary))] hover:text-destructive"
              aria-label="Remove batch"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmRemoveBatch(true);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Meta row: count + staleness/date */}
        <div className="flex items-center gap-2 px-3 pt-2 text-xs">
          <Badge variant="secondary" className="text-xs">
            {totalCount}
          </Badge>
          {showStaleness && daysInStage >= 3 ? (
            <span
              className={cn(
                'font-medium',
                daysInStage > 7 ? 'text-red-500' : 'text-yellow-600 dark:text-yellow-400',
              )}
            >
              {Math.floor(daysInStage)}d in stage
            </span>
          ) : (
            <span className="text-[hsl(var(--text-tertiary))]">
              {new Date(batch.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>

        {/* Readiness + move button */}
        {showReadiness && (
          <div className="flex items-center justify-between gap-2 px-3 pt-2 text-xs">
            <span className="flex items-center gap-1 text-[hsl(var(--text-secondary))]">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              {readyCount}/{totalCount} ready
            </span>
          </div>
        )}

        {/* Move action row */}
        {nextStage && (
          <div className="flex px-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 flex-1 rounded-r-none border-r-0 text-xs"
              disabled={isMoving}
              onClick={(e) => {
                e.stopPropagation();
                onRequestMove(batch, nextStage);
              }}
            >
              <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
              {isMoving ? 'Moving...' : `Move to ${nextStage}`}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestMove(batch, stage);
                    }}
                  >
                    {stage}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Expand toggle */}
        <button
          type="button"
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-b-lg border-t border-[hsl(var(--border))] py-1.5 text-xs text-[hsl(var(--text-tertiary))] hover:bg-[hsl(var(--surface))]"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          aria-expanded={expanded}
        >
          {expanded ? 'Hide products' : `Show ${totalCount} product${totalCount !== 1 ? 's' : ''}`}
        </button>

        {expanded && (
          <div className="border-t border-[hsl(var(--border))] px-3 py-2">
            <BatchProductsTable
              batch={batch}
              products={products}
              isAdmin={isAdmin}
              readOnly={false}
              movingProductRowIndex={movingProductRowIndex}
              isMoving={isMoving}
              nextStage={nextStage}
              showReadiness={showReadiness}
              onProductClick={onProductClick}
              onProductMoveClick={handleProductMoveClick}
              onRemoveProductClick={setConfirmRemoveProductRowIndex}
            />
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
            <span className="font-medium text-[hsl(var(--text-primary))]">&ldquo;{batch.name}&rdquo;</span>?
            All{' '}
            <span className="font-medium text-[hsl(var(--text-primary))]">{batch.productRowIndexes.length}</span>{' '}
            product{batch.productRowIndexes.length !== 1 ? 's' : ''} will be removed from assembly.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemoveBatch(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmRemoveBatch(false);
                void onRemoveBatch(batch._id);
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove product confirmation */}
      {confirmRemoveProductRowIndex !== null && (
        <Dialog
          open={confirmRemoveProductRowIndex !== null}
          onOpenChange={(open) => {
            if (!open) setConfirmRemoveProductRowIndex(null);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Remove product</DialogTitle>
            </DialogHeader>
            <p className="py-2 text-sm text-[hsl(var(--text-secondary))]">
              Remove product from assembly?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmRemoveProductRowIndex(null)}>
                Cancel
              </Button>
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
      )}

      {/* Per-product not-ready confirmation */}
      <Dialog
        open={pendingProductMove !== null}
        onOpenChange={(open) => {
          if (!open) setPendingProductMove(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move product</DialogTitle>
          </DialogHeader>
          <p className="py-2 text-sm text-[hsl(var(--text-secondary))]">
            This product is not ready for{' '}
            <span className="font-medium text-[hsl(var(--text-primary))]">
              {pendingProductMove?.targetStage}
            </span>
            . Move it anyway?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingProductMove(null)}>
              Cancel
            </Button>
            <Button onClick={() => void confirmProductMove()}>Move anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
