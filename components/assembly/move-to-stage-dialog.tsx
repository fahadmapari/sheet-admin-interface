'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetcher } from '@/lib/fetcher';
import { ASSEMBLY_STAGES, type AssemblyResponse, type AssemblyStage } from '@/lib/types';

interface MoveToStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetStage: AssemblyStage | null;
  onConfirm: (strategy: { type: 'new'; name: string } | { type: 'existing'; batchId: string }) => Promise<void>;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function MoveToStageDialog({
  open,
  onOpenChange,
  targetStage,
  onConfirm,
}: MoveToStageDialogProps) {
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [batchName, setBatchName] = useState(todayIso());
  const [existingBatchId, setExistingBatchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [modeInitialized, setModeInitialized] = useState(false);

  const { data: assemblyData } = useSWR<AssemblyResponse>(
    open ? '/api/assembly' : null,
    fetcher,
  );

  const existingBatches = targetStage ? (assemblyData?.[targetStage]?.batches ?? []) : [];

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setBatchName(todayIso());
      setExistingBatchId('');
      setModeInitialized(false);
    }
  }, [open]);

  // Set default mode once data loads (may arrive after dialog opens)
  useEffect(() => {
    if (open && assemblyData && !modeInitialized) {
      setMode(existingBatches.length > 0 ? 'existing' : 'new');
      setModeInitialized(true);
    }
  }, [open, assemblyData, modeInitialized, existingBatches.length]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (mode === 'new') {
        await onConfirm({ type: 'new', name: batchName });
      } else {
        await onConfirm({ type: 'existing', batchId: existingBatchId });
      }
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move to {targetStage}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <Button
              variant={mode === 'new' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('new')}
            >
              New batch
            </Button>
            <Button
              variant={mode === 'existing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('existing')}
              disabled={existingBatches.length === 0}
            >
              Add to existing
            </Button>
          </div>

          {mode === 'new' && (
            <div className="space-y-1.5">
              <Label htmlFor="batch-name">Batch name</Label>
              <Input
                id="batch-name"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="e.g. 2026-04-02"
              />
            </div>
          )}

          {mode === 'existing' && (
            <div className="space-y-1.5">
              <Label>Select batch</Label>
              <Select value={existingBatchId} onValueChange={setExistingBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a batch…" />
                </SelectTrigger>
                <SelectContent>
                  {existingBatches.map((b) => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.name} ({b.productRowIndexes.length} products)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              loading ||
              (mode === 'new' && !batchName.trim()) ||
              (mode === 'existing' && !existingBatchId)
            }
          >
            {loading ? 'Moving…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
