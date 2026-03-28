'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PIC_VALUES, PRODUCT_STATUSES } from '@/lib/constants';
import type { TourProduct } from '@/lib/types';
import { DeleteConfirmDialog } from './delete-confirm-dialog';

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

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b border-border animate-in slide-in-from-top-1 duration-150">
        <span className="text-sm font-medium text-primary shrink-0">
          {selectedProducts.length} row{selectedProducts.length !== 1 ? 's' : ''} selected
        </span>

        <div className="h-4 w-px bg-border mx-1" />

        {/* Set PIC */}
        <Select onValueChange={(value) => applyBulkField('pic', value)}>
          <SelectTrigger className="h-7 w-32 text-xs">
            <SelectValue placeholder="Set PIC…" />
          </SelectTrigger>
          <SelectContent>
            {PIC_VALUES.map((pic) => (
              <SelectItem key={pic} value={pic} className="text-xs">
                {pic}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Set Status */}
        <Select onValueChange={(value) => applyBulkField('productStatus', value)}>
          <SelectTrigger className="h-7 w-44 text-xs">
            <SelectValue placeholder="Set Status…" />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_STATUSES.map((status) => (
              <SelectItem key={status} value={status} className="text-xs">
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Ready for Upload */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => applyBulkField('readyForUpload', 'TRUE')}
        >
          Mark Ready
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => applyBulkField('readyForUpload', 'FALSE')}
        >
          Unmark Ready
        </Button>

        <div className="h-4 w-px bg-border mx-1" />

        {/* Delete */}
        <Button
          variant="destructive"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setDeleteDialogOpen(true)}
        >
          Delete
        </Button>

        <div className="ml-auto">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
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
    </>
  );
}
