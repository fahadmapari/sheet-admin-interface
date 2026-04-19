'use client';

import { useCallback, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BoardColumn } from './board-column';
import { BoardBatchCard } from './board-batch-card';
import { isProductReady } from './batch-helpers';
import {
  ASSEMBLY_STAGES,
  type AssemblyBatch,
  type AssemblyResponse,
  type AssemblyStage,
  type TourProduct,
} from '@/lib/types';

type PendingBatchMove = {
  batch: AssemblyBatch;
  targetStage: AssemblyStage;
  readyProducts: TourProduct[];
  notReadyCount: number;
};

interface BoardViewProps {
  assemblyData: AssemblyResponse;
  products: TourProduct[];
  movingBatchId: string | null;
  movingProductRowIndex: number | null;
  isAdmin: boolean;
  owners: Partial<Record<AssemblyStage, string[]>>;
  allEmails: string[];
  collapsed: Record<AssemblyStage, boolean>;
  onCollapsedChange: (stage: AssemblyStage, value: boolean) => void;
  onOwnersChange: (stage: AssemblyStage, emails: string[]) => Promise<void>;
  onBatchMoveToStage: (batch: AssemblyBatch, target: AssemblyStage) => Promise<void>;
  onMoveProductToNextStage: (product: TourProduct, batch: AssemblyBatch) => Promise<void>;
  onProductClick: (product: TourProduct) => void;
  onRemoveBatch: (batchId: string) => Promise<void>;
  onRemoveProduct: (rowIndex: number) => Promise<void>;
}

export function BoardView({
  assemblyData,
  products,
  movingBatchId,
  movingProductRowIndex,
  isAdmin,
  owners,
  allEmails,
  collapsed,
  onCollapsedChange,
  onOwnersChange,
  onBatchMoveToStage,
  onMoveProductToNextStage,
  onProductClick,
  onRemoveBatch,
  onRemoveProduct,
}: BoardViewProps) {
  const [activeBatch, setActiveBatch] = useState<AssemblyBatch | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingBatchMove | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const runBatchMove = useCallback(
    (batch: AssemblyBatch, targetStage: AssemblyStage) => {
      if (batch.stage === targetStage) return;
      const sourceIndex = ASSEMBLY_STAGES.indexOf(batch.stage);
      const targetIndex = ASSEMBLY_STAGES.indexOf(targetStage);
      if (targetIndex < sourceIndex) {
        // Backward move — no readiness check.
        void onBatchMoveToStage(batch, targetStage);
        return;
      }
      // Forward move — run readiness gate.
      const batchProducts = products.filter((p) => batch.productRowIndexes.includes(p.rowIndex));
      const readyProducts = batchProducts.filter((p) => isProductReady(p, batch.stage));
      const notReadyCount = batchProducts.length - readyProducts.length;
      if (notReadyCount === 0) {
        void onBatchMoveToStage(batch, targetStage);
        return;
      }
      setPendingMove({ batch, targetStage, readyProducts, notReadyCount });
    },
    [onBatchMoveToStage, products],
  );

  const confirmPendingMove = async () => {
    if (!pendingMove) return;
    if (pendingMove.readyProducts.length === 0) {
      setPendingMove(null);
      return;
    }
    const filtered: AssemblyBatch = {
      ...pendingMove.batch,
      productRowIndexes: pendingMove.readyProducts.map((p) => p.rowIndex),
    };
    await onBatchMoveToStage(filtered, pendingMove.targetStage);
    setPendingMove(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { batch?: AssemblyBatch } | undefined;
    setActiveBatch(data?.batch ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveBatch(null);
    const { active, over } = event;
    if (!over) return;
    const batch = (active.data.current as { batch?: AssemblyBatch } | undefined)?.batch;
    const targetStage = (over.data.current as { stage?: AssemblyStage } | undefined)?.stage;
    if (!batch || !targetStage) return;
    runBatchMove(batch, targetStage);
  };

  const isNoneReady = pendingMove?.readyProducts.length === 0;

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-2" style={{ minHeight: '60vh' }}>
          {ASSEMBLY_STAGES.map((stage) => {
            const batches = assemblyData[stage]?.batches ?? [];
            return (
              <BoardColumn
                key={stage}
                stage={stage}
                batches={batches}
                isAdmin={isAdmin}
                stageOwners={owners[stage] ?? []}
                allEmails={allEmails}
                collapsed={collapsed[stage]}
                onCollapsedChange={(c) => onCollapsedChange(stage, c)}
                onOwnersChange={(emails) => onOwnersChange(stage, emails)}
              >
                {batches.map((batch) => (
                  <BoardBatchCard
                    key={batch._id}
                    batch={batch}
                    products={products}
                    isAdmin={isAdmin}
                    isMoving={movingBatchId === batch._id}
                    movingProductRowIndex={movingProductRowIndex}
                    onRequestMove={runBatchMove}
                    onMoveProductToNextStage={onMoveProductToNextStage}
                    onProductClick={onProductClick}
                    onRemoveBatch={onRemoveBatch}
                    onRemoveProduct={onRemoveProduct}
                  />
                ))}
              </BoardColumn>
            );
          })}
        </div>

        <DragOverlay>
          {activeBatch ? (
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm font-medium shadow-lg">
              {activeBatch.name}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Batch readiness dialog (forward moves only) */}
      <Dialog open={pendingMove !== null} onOpenChange={(open) => { if (!open) setPendingMove(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move batch</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-[hsl(var(--text-secondary))]">
            {isNoneReady ? (
              <p>
                No products in this batch are ready to be moved to{' '}
                <span className="font-medium text-[hsl(var(--text-primary))]">
                  {pendingMove?.targetStage}
                </span>
                .
              </p>
            ) : (
              <p>
                <span className="font-medium text-[hsl(var(--text-primary))]">
                  {pendingMove?.notReadyCount}
                </span>{' '}
                product{pendingMove?.notReadyCount !== 1 ? 's are' : ' is'} not ready and will be skipped.
                Only{' '}
                <span className="font-medium text-[hsl(var(--text-primary))]">
                  {pendingMove?.readyProducts.length}
                </span>{' '}
                ready product{pendingMove?.readyProducts.length !== 1 ? 's' : ''} will be moved to{' '}
                <span className="font-medium text-[hsl(var(--text-primary))]">
                  {pendingMove?.targetStage}
                </span>
                .
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingMove(null)}>
              Cancel
            </Button>
            {!isNoneReady && (
              <Button onClick={() => void confirmPendingMove()}>Move ready products</Button>
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
