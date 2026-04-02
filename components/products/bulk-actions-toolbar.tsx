'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PIC_VALUES, PRODUCT_STATUSES } from '@/lib/constants';
import { ASSEMBLY_STAGES, type AssemblyStage, type TourProduct } from '@/lib/types';
import { DeleteConfirmDialog } from './delete-confirm-dialog';
import { MoveToStageDialog } from '@/components/assembly/move-to-stage-dialog';

interface BulkActionsToolbarProps {
  selectedProducts: TourProduct[];
  onClearSelection: () => void;
  onMutate: () => void;
}

export function BulkActionsToolbar({
  selectedProducts,
  onClearSelection,
  onMutate,
}: BulkActionsToolbarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveTargetStage, setMoveTargetStage] = useState<AssemblyStage | null>(null);

  if (selectedProducts.length === 0) return null;

  const applyBulkField = async (field: string, value: string) => {
    const rowIndexes = selectedProducts.map((p) => p.rowIndex);
    const res = await fetch('/api/products/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowIndexes, field, value }),
    });
    if (res.ok) {
      toast.success(`Updated ${rowIndexes.length} row${rowIndexes.length !== 1 ? 's' : ''}`);
      onMutate();
      onClearSelection();
    } else {
      toast.error('Bulk update failed');
    }
  };

  const handleBulkDelete = async () => {
    const rowIndexes = selectedProducts.map((p) => p.rowIndex);
    const res = await fetch('/api/products/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowIndexes }),
    });
    if (res.ok) {
      toast.success(`Deleted ${rowIndexes.length} row${rowIndexes.length !== 1 ? 's' : ''}`);
      onMutate();
      onClearSelection();
    } else {
      toast.error('Bulk delete failed');
    }
  };

  const handleStageSelect = (stage: AssemblyStage) => {
    setMoveTargetStage(stage);
    setMoveDialogOpen(true);
  };

  const handleMoveConfirm = async (
    strategy: { type: 'new'; name: string } | { type: 'existing'; batchId: string },
  ) => {
    const rowIndexes = selectedProducts.map((p) => p.rowIndex);
    const res = await fetch('/api/assembly/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rowIndexes,
        targetStage: moveTargetStage,
        batchStrategy: strategy,
      }),
    });
    if (res.ok) {
      toast.success(
        `Moved ${rowIndexes.length} product${rowIndexes.length !== 1 ? 's' : ''} to "${moveTargetStage}"`,
      );
      onMutate();
      onClearSelection();
    } else {
      toast.error('Move failed');
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2 animate-in slide-in-from-top-1 duration-150">
        <span className="shrink-0 text-sm font-medium text-[hsl(var(--text-primary))]">
          {selectedProducts.length} row{selectedProducts.length !== 1 ? 's' : ''} selected
        </span>

        <div className="mx-1 h-4 w-px bg-[hsl(var(--border))]" />

        <Select onValueChange={(value) => applyBulkField('pic', value)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Set PIC…" />
          </SelectTrigger>
          <SelectContent>
            {PIC_VALUES.map((pic) => (
              <SelectItem key={pic} value={pic}>
                {pic}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={(value) => applyBulkField('productStatus', value)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Set Status…" />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => applyBulkField('readyForUpload', 'TRUE')}
        >
          Mark Ready
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyBulkField('readyForUpload', 'FALSE')}
        >
          Unmark Ready
        </Button>

        <div className="mx-1 h-4 w-px bg-[hsl(var(--border))]" />

        <Select onValueChange={(value) => handleStageSelect(value as AssemblyStage)}>
          <SelectTrigger className="w-48">
            <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
            <SelectValue placeholder="Move to Stage…" />
          </SelectTrigger>
          <SelectContent>
            {ASSEMBLY_STAGES.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {stage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="mx-1 h-4 w-px bg-[hsl(var(--border))]" />

        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteDialogOpen(true)}
        >
          Delete
        </Button>

        <div className="ml-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearSelection}
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        count={selectedProducts.length}
        onConfirm={handleBulkDelete}
      />

      <MoveToStageDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        targetStage={moveTargetStage}
        onConfirm={handleMoveConfirm}
      />
    </>
  );
}
