// components/ui/edit-history-popover.tsx
'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { EditRecord } from '@/lib/hooks/use-edit-history';

function truncate(str: string, max = 20): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

interface EditHistoryPopoverProps<P = unknown> {
  history: EditRecord<P>[];
  onRevert: (record: EditRecord<P>) => Promise<void>;
}

export function EditHistoryPopover<P>({ history, onRevert }: EditHistoryPopoverProps<P>) {
  const [revertingId, setRevertingId] = useState<string | null>(null);

  async function handleRevert(record: EditRecord<P>) {
    setRevertingId(record.id);
    try {
      await onRevert(record);
    } finally {
      setRevertingId(null);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-7 w-7 p-0"
          title="Edit history"
          aria-label="Edit history"
        >
          <Clock className="h-3.5 w-3.5" />
          {history.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] leading-none">
              {history.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b border-[hsl(var(--border))] px-4 py-3">
          <span className="text-sm font-medium">Edit History</span>
        </div>
        {history.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-[hsl(var(--text-secondary))]">
            No edits this session
          </p>
        ) : (
          <div className="max-h-[min(400px,70vh)] overflow-y-auto overflow-x-hidden">
            <div className="divide-y divide-[hsl(var(--border))]">
              {history.map((record) => {
                const isReverting = revertingId === record.id;
                return (
                  <div key={record.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-[hsl(var(--text-primary))]">
                          {record.rowLabel} · {record.fieldLabel}
                        </p>
                        <p className="mt-0.5 overflow-hidden text-xs text-[hsl(var(--text-secondary))] whitespace-nowrap text-ellipsis">
                          <span>{truncate(record.oldValueDisplay)}</span>
                          <span className="mx-1 text-[hsl(var(--text-tertiary))]">→</span>
                          <span>{truncate(record.newValueDisplay)}</span>
                        </p>
                        <p className="mt-0.5 text-[10px] text-[hsl(var(--text-tertiary))]">
                          {formatDistanceToNow(record.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 shrink-0 px-2 text-xs"
                        disabled={revertingId !== null}
                        onClick={() => handleRevert(record)}
                      >
                        {isReverting ? (
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                        ) : (
                          'Revert'
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
