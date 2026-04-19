'use client';

import { useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Check, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getStageStaleness } from './batch-helpers';
import type { AssemblyBatch, AssemblyStage } from '@/lib/types';

interface BoardColumnProps {
  stage: AssemblyStage;
  batches: AssemblyBatch[];
  isAdmin: boolean;
  stageOwners: string[];
  allEmails: string[];
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onOwnersChange: (emails: string[]) => Promise<void>;
  children: React.ReactNode;
}

export function BoardColumn({
  stage,
  batches,
  isAdmin,
  stageOwners,
  allEmails,
  collapsed,
  onCollapsedChange,
  onOwnersChange,
  children,
}: BoardColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: `stage-col-${stage}`, data: { stage } });

  const [ownerPopoverOpen, setOwnerPopoverOpen] = useState(false);
  const [pendingOwners, setPendingOwners] = useState<string[]>([]);
  const [savingOwners, setSavingOwners] = useState(false);

  // When a drag hovers a collapsed column, auto-expand mid-drag.
  useEffect(() => {
    if (isOver && collapsed) {
      onCollapsedChange(false);
    }
  }, [isOver, collapsed, onCollapsedChange]);

  const staleness = stage !== 'Uploaded' ? getStageStaleness(batches) : 'none';
  const initials = (email: string) => {
    const parts = email.split('@')[0].split(/[._-]/);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  };
  const displayOwners = stageOwners.slice(0, 3);
  const extraCount = stageOwners.length - 3;

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

  if (collapsed) {
    return (
      <div
        ref={setNodeRef}
        id={`board-col-${stage}`}
        className={cn(
          'flex w-12 shrink-0 flex-col items-center gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] py-3',
          isOver && 'ring-2 ring-primary',
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          aria-label={`Expand ${stage} column`}
          onClick={() => onCollapsedChange(false)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span
          className="select-none text-xs font-semibold text-[hsl(var(--text-secondary))]"
          style={{ writingMode: 'vertical-rl' }}
        >
          {stage}
        </span>
        <Badge variant="outline" className="text-xs">
          {batches.length}
        </Badge>
      </div>
    );
  }

  return (
    <div
      id={`board-col-${stage}`}
      className="flex w-[320px] shrink-0 flex-col rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))]"
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] px-3 py-2.5">
        <span className="flex-1 truncate text-sm font-semibold text-[hsl(var(--text-primary))]">
          {stage}
        </span>
        {staleness !== 'none' && (
          <span
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              staleness === 'red' ? 'bg-red-500' : 'bg-yellow-500',
            )}
            title={staleness === 'red' ? 'Batch stuck >7 days' : 'Batch stuck >3 days'}
          />
        )}
        <Badge variant="outline" className="text-xs">
          {batches.length}
        </Badge>

        {/* Owner chips */}
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
                onClick={(e) => {
                  e.stopPropagation();
                  openOwnerPopover();
                }}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setOwnerPopoverOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    disabled={savingOwners}
                    onClick={() => void saveOwners()}
                  >
                    {savingOwners ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))]"
          aria-label={`Collapse ${stage} column`}
          onClick={() => onCollapsedChange(true)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Droppable body */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-3 transition-colors',
          isOver && 'bg-[hsl(var(--surface-raised))]',
        )}
      >
        {batches.length === 0 ? (
          <p className="py-4 text-center text-xs text-[hsl(var(--text-tertiary))]">No batches</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
