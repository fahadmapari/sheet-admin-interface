'use client';

import { useState } from 'react';
import { Check, ChevronDown, ChevronRight, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { BatchCard } from './batch-card';
import type { AssemblyBatch, AssemblyStage, TourProduct } from '@/lib/types';

interface StageSectionProps {
  stage: AssemblyStage;
  batches: AssemblyBatch[];
  products: TourProduct[];
  movingBatchId: string | null;
  movingProductRowIndex: number | null;
  isAdmin: boolean;
  readOnly?: boolean;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  stageOwners: string[];
  allEmails: string[];
  onOwnersChange: (emails: string[]) => Promise<void>;
  onBatchMoveToNextStage: (batch: AssemblyBatch) => Promise<void>;
  onBatchMoveToStage: (batch: AssemblyBatch, targetStage: AssemblyStage) => Promise<void>;
  onMoveProductToNextStage: (product: TourProduct, batch: AssemblyBatch) => Promise<void>;
  onProductClick: (product: TourProduct) => void;
  onRemoveBatch: (batchId: string) => Promise<void>;
  onRemoveProduct: (rowIndex: number) => Promise<void>;
}

export function StageSection({
  stage,
  batches,
  products,
  movingBatchId,
  movingProductRowIndex,
  isAdmin,
  readOnly = false,
  collapsed,
  onCollapsedChange,
  stageOwners,
  allEmails,
  onOwnersChange,
  onBatchMoveToNextStage,
  onBatchMoveToStage,
  onMoveProductToNextStage,
  onProductClick,
  onRemoveBatch,
  onRemoveProduct,
}: StageSectionProps) {
  const [ownerPopoverOpen, setOwnerPopoverOpen] = useState(false);
  const [pendingOwners, setPendingOwners] = useState<string[]>([]);
  const [savingOwners, setSavingOwners] = useState(false);

  const totalProducts = batches.reduce((sum, b) => sum + b.productRowIndexes.length, 0);

  function openOwnerPopover() {
    setPendingOwners([...stageOwners]);
    setOwnerPopoverOpen(true);
  }

  function toggleEmail(email: string) {
    setPendingOwners((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email],
    );
  }

  async function saveOwners() {
    setSavingOwners(true);
    try {
      await onOwnersChange(pendingOwners);
      setOwnerPopoverOpen(false);
    } finally {
      setSavingOwners(false);
    }
  }

  const initials = (email: string) => {
    const parts = email.split('@')[0].split(/[._-]/);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  };

  const displayOwners = stageOwners.slice(0, 3);
  const extraCount = stageOwners.length - 3;

  return (
    <div id={`stage-${stage}`} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
      <div className="flex items-center gap-2 px-5 py-4">
        <button
          className="flex flex-1 items-center gap-3 text-left"
          onClick={() => onCollapsedChange(!collapsed)}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--text-tertiary))]" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-[hsl(var(--text-tertiary))]" />
          )}
          <span className="flex-1 text-sm font-semibold text-[hsl(var(--text-primary))]">{stage}</span>
          <Badge variant="outline" className="text-xs">
            {totalProducts} product{totalProducts !== 1 ? 's' : ''}
          </Badge>
        </button>

        {/* Owner chips */}
        {!readOnly && (
          <div className="flex items-center gap-1">
            {stageOwners.length > 0 && (
              <TooltipProvider>
                <div className="flex items-center -space-x-1">
                  {displayOwners.map((email) => (
                    <Tooltip key={email}>
                      <TooltipTrigger asChild>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] text-[10px] font-semibold text-[hsl(var(--text-primary))]">
                          {initials(email)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{email}</TooltipContent>
                    </Tooltip>
                  ))}
                  {extraCount > 0 && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] text-[10px] font-semibold text-[hsl(var(--text-tertiary))]">
                      +{extraCount}
                    </span>
                  )}
                </div>
              </TooltipProvider>
            )}

            {isAdmin && (
              <Popover open={ownerPopoverOpen} onOpenChange={setOwnerPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))]"
                    aria-label="Assign team to stage"
                    onClick={(e) => { e.stopPropagation(); openOwnerPopover(); }}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="end" onClick={(e) => e.stopPropagation()}>
                  <Command>
                    <CommandInput placeholder="Search people..." />
                    <CommandEmpty>No people found.</CommandEmpty>
                    <CommandGroup className="max-h-52 overflow-y-auto">
                      {allEmails.map((email) => (
                        <CommandItem key={email} onSelect={() => toggleEmail(email)}>
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              pendingOwners.includes(email) ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          {email}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                  <div className="flex items-center justify-between border-t border-[hsl(var(--border))] px-3 py-2">
                    <span className="text-xs text-[hsl(var(--text-tertiary))]">
                      {pendingOwners.length} selected
                    </span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOwnerPopoverOpen(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" className="h-7 text-xs" disabled={savingOwners} onClick={() => void saveOwners()}>
                        {savingOwners ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="border-t border-[hsl(var(--border))] px-5 py-3 space-y-2">
          {batches.length === 0 ? (
            <p className="py-2 text-sm text-[hsl(var(--text-tertiary))]">No batches in this stage.</p>
          ) : (
            batches.map((batch) => (
              <BatchCard
                key={batch._id}
                batch={batch}
                products={products}
                isMoving={movingBatchId === batch._id}
                movingProductRowIndex={movingProductRowIndex}
                isAdmin={isAdmin}
                readOnly={readOnly}
                onMoveToNextStage={onBatchMoveToNextStage}
                onMoveToStage={onBatchMoveToStage}
                onMoveProductToNextStage={(product) => onMoveProductToNextStage(product, batch)}
                onProductClick={onProductClick}
                onRemoveBatch={onRemoveBatch}
                onRemoveProduct={onRemoveProduct}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
