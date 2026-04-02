'use client';

import type { KeyboardEvent, ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ExternalLink } from 'lucide-react';
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
import { cn, parseLinkField } from '@/lib/utils';

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

const LINK_FIELDS = new Set<keyof TourProduct>(['link']);
const IMAGE_LINKS_FIELDS = new Set<keyof TourProduct>(['imageLinks']);


function buildLinkField(text: string, url: string): string {
  const t = text.trim();
  const u = url.trim();
  if (t && u) return `${t}||${u}`;
  return u || t;
}

function LinkEditCell({ product, field, onSaved }: InlineEditCellProps) {
  const rawValue = product[field];
  const strValue = rawValue ? String(rawValue) : '';
  const initial = parseLinkField(strValue);

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initial.text);
  const [url, setUrl] = useState(initial.url);
  const [saving, setSaving] = useState(false);
  const textRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!editing) {
      const p = parseLinkField(rawValue ? String(rawValue) : '');
      setText(p.text);
      setUrl(p.url);
    }
  }, [rawValue, editing]);

  useEffect(() => {
    if (editing && textRef.current) textRef.current.focus();
  }, [editing]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const save = useCallback(
    async (textVal: string, urlVal: string) => {
      if (!isMountedRef.current || savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      const combined = buildLinkField(textVal, urlVal);
      onSaved(field, combined);
      try {
        const res = await fetch(`/api/products/${product.rowIndex}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field,
            value: combined,
            expectedLinkTitle: parseLinkField(product.link ?? '').text,
          }),
        });
        if (!isMountedRef.current) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? `HTTP ${res.status}`);
        }
      } catch (err) {
        if (isMountedRef.current) {
          toast.error(`Failed to save: ${err instanceof Error ? err.message : String(err)}`);
          onSaved(field, strValue);
          const p = parseLinkField(strValue);
          setText(p.text);
          setUrl(p.url);
        }
      } finally {
        savingRef.current = false;
        if (isMountedRef.current) setSaving(false);
      }
    },
    [field, product.rowIndex, product.link, strValue, onSaved],
  );

  const commitAndExit = useCallback(
    (textVal: string, urlVal: string) => {
      setEditing(false);
      if (buildLinkField(textVal, urlVal) !== strValue) save(textVal, urlVal);
    },
    [strValue, save],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitAndExit(text, url);
    } else if (e.key === 'Escape') {
      const p = parseLinkField(strValue);
      setText(p.text);
      setUrl(p.url);
      setEditing(false);
    }
  };

  if (!editing) {
    const displayText = text || url;
    return (
      <button
        className="relative w-full cursor-pointer rounded p-0.5 text-left transition-colors hover:bg-[hsl(var(--surface))]"
        onClick={() => setEditing(true)}
      >
        <span className="flex items-center gap-1">
          {displayText ? (
            <span className="max-w-[180px] truncate block text-sm" title={displayText}>
              {displayText}
            </span>
          ) : (
            <span className="text-xs text-[hsl(var(--text-tertiary))]">—</span>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0 text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))] transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </span>
        {saving && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/50">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="space-y-1.5 py-1 relative">
      <input
        ref={textRef}
        type="text"
        placeholder="Title (optional)"
        className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <input
        type="url"
        placeholder="https://..."
        className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => commitAndExit(text, url)}
      />
      {saving && (
        <span className="absolute inset-0 flex items-center justify-center bg-background/50">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </span>
      )}
    </div>
  );
}

function ImageLinksCell({ product, field, onSaved }: InlineEditCellProps) {
  const rawValue = product[field];
  const strValue = rawValue ? String(rawValue) : '';
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(strValue);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isMountedRef = useRef(true);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!editing) setInputValue(strValue);
  }, [strValue, editing]);

  useEffect(() => {
    if (editing && textareaRef.current) textareaRef.current.focus();
  }, [editing]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const save = useCallback(
    async (valueToSave: string) => {
      if (!isMountedRef.current || savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      onSaved(field, valueToSave);
      try {
        const res = await fetch(`/api/products/${product.rowIndex}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field,
            value: valueToSave,
            expectedLinkTitle: parseLinkField(product.link ?? '').text,
          }),
        });
        if (!isMountedRef.current) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? `HTTP ${res.status}`);
        }
      } catch (err) {
        if (isMountedRef.current) {
          toast.error(`Failed to save: ${err instanceof Error ? err.message : String(err)}`);
          onSaved(field, strValue);
          setInputValue(strValue);
        }
      } finally {
        savingRef.current = false;
        if (isMountedRef.current) setSaving(false);
      }
    },
    [field, product.rowIndex, product.link, strValue, onSaved],
  );

  const commitAndExit = useCallback(
    (value: string) => {
      setEditing(false);
      if (value !== strValue) save(value);
    },
    [strValue, save],
  );

  if (editing) {
    return (
      <div className="relative w-full">
        <Textarea
          ref={textareaRef as RefObject<HTMLTextAreaElement>}
          className="min-h-[60px] text-xs resize-none w-full"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setInputValue(strValue);
              setEditing(false);
            }
          }}
          onBlur={() => commitAndExit(inputValue)}
        />
        {saving && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/50">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          </span>
        )}
      </div>
    );
  }

  const links = strValue
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseLinkField);

  return (
    <div
      className="relative cursor-pointer rounded p-0.5 transition-colors hover:bg-[hsl(var(--surface))]"
      onClick={() => setEditing(true)}
    >
      {links.length > 0 ? (
        <div className="flex flex-col items-end gap-1">
          {links.map((link, i) =>
            link.url ? (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                <span>{link.text || link.url}</span>
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
            ) : (
              <span key={i} className="text-sm text-[hsl(var(--text-primary))]">{link.text}</span>
            )
          )}
        </div>
      ) : (
        <span className="text-xs text-[hsl(var(--text-tertiary))]">—</span>
      )}
      {saving && (
        <span className="absolute inset-0 flex items-center justify-center bg-background/50">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </span>
      )}
    </div>
  );
}

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

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const save = useCallback(
    async (valueToSave: string) => {
      if (!isMountedRef.current) return;
      if (savingRef.current) return; // prevent concurrent saves
      savingRef.current = true;
      setSaving(true);
      // Optimistic update — notify parent immediately so UI reflects change
      onSaved(field, valueToSave);
      try {
        const res = await fetch(`/api/products/${product.rowIndex}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field,
            value: valueToSave,
            expectedLinkTitle: parseLinkField(product.link ?? '').text,
          }),
        });
        if (!isMountedRef.current) return;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? `HTTP ${res.status}`);
        }
      } catch (err) {
        if (isMountedRef.current) {
          const msg = err instanceof Error ? err.message : String(err);
          toast.error(`Failed to save: ${msg}`);
          // Revert optimistic update
          onSaved(field, fieldValueToString(field, rawValue));
          setInputValue(fieldValueToString(field, rawValue));
        }
      } finally {
        savingRef.current = false;
        if (isMountedRef.current) setSaving(false);
      }
    },
    [field, product.rowIndex, product.link, rawValue, onSaved],
  );

  const commitAndExit = useCallback(
    (value: string) => {
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
          value={inputValue || '__none__'}
          onValueChange={(val) => {
            const nextValue = val === '__none__' ? '' : val;
            setInputValue(nextValue);
            setEditing(false);
            const original = fieldValueToString(field, rawValue);
            if (nextValue !== original) save(nextValue);
          }}
          onOpenChange={(open) => {
            if (!open) setEditing(false);
          }}
        >
          <SelectTrigger className="h-7 text-xs w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-xs">
              —
            </SelectItem>
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
          value={inputValue || '__none__'}
          onValueChange={(val) => {
            const nextValue = val === '__none__' ? '' : val;
            setInputValue(nextValue);
            setEditing(false);
            const original = fieldValueToString(field, rawValue);
            if (nextValue !== original) save(nextValue);
          }}
          onOpenChange={(open) => {
            if (!open) setEditing(false);
          }}
        >
          <SelectTrigger className="h-7 text-xs w-full">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-xs">
              —
            </SelectItem>
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
      <Textarea
        ref={inputRef as RefObject<HTMLTextAreaElement>}
        className="min-h-[60px] text-xs resize-none"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
    );
  }

  // Image links — multi-link display with textarea edit
  if (IMAGE_LINKS_FIELDS.has(field as keyof TourProduct)) {
    return <ImageLinksCell product={product} field={field} onSaved={onSaved} />;
  }

  // Link fields — dual text+URL inputs
  if (LINK_FIELDS.has(field as keyof TourProduct)) {
    return <LinkEditCell product={product} field={field} onSaved={onSaved} />;
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
    <Input
      ref={inputRef as RefObject<HTMLInputElement>}
      type="text"
      className="h-7 text-xs px-1"
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    />
  );
}
