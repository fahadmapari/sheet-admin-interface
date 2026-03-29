'use client';

import type { KeyboardEvent, ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  BOOLEAN_FIELDS,
  PRODUCT_STATUSES,
  PIC_VALUES,
} from '@/lib/constants';
import { getProductStatusClasses } from '@/lib/design-system';
import type { TourProduct } from '@/lib/types';
import { cn } from '@/lib/utils';

interface InlineEditCellProps {
  product: TourProduct;
  field: keyof Omit<TourProduct, 'rowIndex'>;
  onSaved: (field: string, value: string) => void;
}

const LONG_TEXT_FIELDS = new Set<keyof TourProduct>([
  'notes',
  'notesGeneral',
  'qualityRemarks',
  'componentsOfTour',
]);

function getDisplayValue(
  field: keyof Omit<TourProduct, 'rowIndex'>,
  value: TourProduct[keyof TourProduct],
): ReactNode {
  if (BOOLEAN_FIELDS.has(field as keyof TourProduct)) {
    const boolVal = Boolean(value);
    return <span className={boolVal ? 'text-[hsl(var(--text-primary))]' : 'text-[hsl(var(--text-tertiary))]'}>●</span>;
  }

  if (field === 'productStatus') {
    const strVal = value as string | null;
    if (!strVal) return <span className="text-xs text-[hsl(var(--text-tertiary))]">—</span>;
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
          getProductStatusClasses(strVal),
        )}
      >
        {strVal}
      </span>
    );
  }

  if (value === null || value === undefined || value === '') {
    return <span className="text-xs text-[hsl(var(--text-tertiary))]">—</span>;
  }

  return (
    <span className="max-w-[200px] truncate block" title={String(value)}>
      {String(value)}
    </span>
  );
}

function fieldValueToString(
  field: keyof Omit<TourProduct, 'rowIndex'>,
  value: TourProduct[keyof TourProduct],
): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return String(value);
}

export function InlineEditCell({ product, field, onSaved }: InlineEditCellProps) {
  const rawValue = product[field];
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(() => fieldValueToString(field, rawValue));
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const isMountedRef = useRef(true);
  const savingRef = useRef(false);

  // Keep inputValue in sync if product changes externally
  useEffect(() => {
    if (!editing) {
      setInputValue(fieldValueToString(field, rawValue));
    }
  }, [rawValue, field, editing]);

  // Focus the input when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  // Track mounted state and clear debounce timer on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const save = useCallback(
    async (valueToSave: string) => {
      if (!isMountedRef.current) return;
      if (savingRef.current) return; // prevent concurrent saves
      savingRef.current = true;
      setSaving(true);
      try {
        const res = await fetch(`/api/products/${product.rowIndex}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field, value: valueToSave }),
        });
        if (!isMountedRef.current) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? `HTTP ${res.status}`);
        }
        if (isMountedRef.current) {
          onSaved(field, valueToSave);
          toast.success('Saved');
          setEditing(false);
        }
      } catch (err) {
        if (isMountedRef.current) {
          const msg = err instanceof Error ? err.message : String(err);
          toast.error(`Failed to save: ${msg}`);
          // Revert
          setInputValue(fieldValueToString(field, rawValue));
          setEditing(false);
        }
      } finally {
        savingRef.current = false;
        if (isMountedRef.current) setSaving(false);
      }
    },
    [field, product.rowIndex, rawValue, onSaved],
  );

  const commitAndExit = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setEditing(false);
      const original = fieldValueToString(field, rawValue);
      if (value !== original) {
        save(value);
      }
    },
    [field, rawValue, save],
  );

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitAndExit(inputValue);
    } else if (e.key === 'Escape') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setInputValue(fieldValueToString(field, rawValue));
      setEditing(false);
    }
  };

  const handleBlur = () => {
    commitAndExit(inputValue);
  };

  // Boolean fields — Switch, saves immediately
  if (BOOLEAN_FIELDS.has(field as keyof TourProduct)) {
    const checked = Boolean(rawValue);
    return (
      <div className="relative flex items-center justify-center">
        <Switch
          checked={checked}
          disabled={saving}
          onCheckedChange={(next) => {
            const val = next ? 'TRUE' : 'FALSE';
            save(val);
          }}
        />
        {saving && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/50">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          </span>
        )}
      </div>
    );
  }

  // productStatus — Select
  if (field === 'productStatus') {
    if (!editing) {
      return (
        <button
          className="w-full cursor-pointer rounded p-0.5 text-left transition-colors hover:bg-[hsl(var(--surface))]"
          onClick={() => setEditing(true)}
        >
          {getDisplayValue(field, rawValue)}
        </button>
      );
    }
    return (
      <div className="relative">
        <Select
          defaultOpen
          value={inputValue}
          onValueChange={(val) => {
            setInputValue(val);
            setEditing(false);
            const original = fieldValueToString(field, rawValue);
            if (val !== original) save(val);
          }}
          onOpenChange={(open) => {
            if (!open) setEditing(false);
          }}
        >
          <SelectTrigger className="h-7 text-xs w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {saving && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/50">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          </span>
        )}
      </div>
    );
  }

  // pic — Select
  if (field === 'pic') {
    if (!editing) {
      return (
        <button
          className="w-full cursor-pointer rounded p-0.5 text-left transition-colors hover:bg-[hsl(var(--surface))]"
          onClick={() => setEditing(true)}
        >
          {getDisplayValue(field, rawValue)}
        </button>
      );
    }
    return (
      <div className="relative">
        <Select
          defaultOpen
          value={inputValue || undefined}
          onValueChange={(val) => {
            setInputValue(val);
            setEditing(false);
            const original = fieldValueToString(field, rawValue);
            if (val !== original) save(val);
          }}
          onOpenChange={(open) => {
            if (!open) setEditing(false);
          }}
        >
          <SelectTrigger className="h-7 text-xs w-full">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {PIC_VALUES.map((p) => (
              <SelectItem key={p} value={p} className="text-xs">
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {saving && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/50">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          </span>
        )}
      </div>
    );
  }

  // Long text — Textarea
  if (LONG_TEXT_FIELDS.has(field as keyof TourProduct)) {
    if (!editing) {
      return (
        <button
          className="w-full cursor-pointer rounded p-0.5 text-left transition-colors hover:bg-[hsl(var(--surface))]"
          onClick={() => setEditing(true)}
        >
          {getDisplayValue(field, rawValue)}
        </button>
      );
    }
    return (
      <div className="relative">
        <Textarea
          ref={inputRef as RefObject<HTMLTextAreaElement>}
          className="min-h-[60px] text-xs resize-none"
          value={inputValue}
          onChange={(e) => {
            const newValue = e.target.value;
            setInputValue(newValue);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
              save(newValue);
            }, 300);
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        />
        {saving && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/50 rounded">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          </span>
        )}
      </div>
    );
  }

  // Default — text Input
  if (!editing) {
    return (
      <button
        className="w-full cursor-pointer rounded p-0.5 text-left transition-colors hover:bg-[hsl(var(--surface))]"
        onClick={() => setEditing(true)}
      >
        {getDisplayValue(field, rawValue)}
      </button>
    );
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef as RefObject<HTMLInputElement>}
        type="text"
        className="h-7 text-xs px-1"
        value={inputValue}
        onChange={(e) => {
          const newValue = e.target.value;
          setInputValue(newValue);
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            save(newValue);
          }, 300);
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
      {saving && (
        <span className="absolute inset-0 flex items-center justify-center bg-background/50 rounded">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </span>
      )}
    </div>
  );
}
