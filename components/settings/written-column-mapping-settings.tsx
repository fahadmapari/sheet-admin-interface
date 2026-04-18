'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWrittenColumnMapping, type ColumnMappingEntry } from '@/lib/hooks/use-written-column-mapping';
import { colLetterToIndex } from '@/lib/column-utils';
import { toast } from 'sonner';

type DraftMap = Record<string, string>;

function validateDraft(
  entries: ColumnMappingEntry[],
  draft: DraftMap,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const indexToFields: Record<number, string[]> = {};

  for (const entry of entries) {
    const letter = (draft[entry.field] ?? entry.colLetter).toUpperCase();
    if (!/^[A-Z]{1,2}$/.test(letter)) {
      errors[entry.field] = 'Must be A–BR';
      continue;
    }
    let idx: number;
    try {
      idx = colLetterToIndex(letter);
    } catch {
      errors[entry.field] = 'Invalid letter';
      continue;
    }
    if (idx < 0 || idx > 69) {
      errors[entry.field] = 'Must be A–BR';
      continue;
    }
    if (!indexToFields[idx]) indexToFields[idx] = [];
    indexToFields[idx].push(entry.field);
  }

  for (const fields of Object.values(indexToFields)) {
    if (fields.length > 1) {
      for (const f of fields) {
        errors[f] = `Duplicate with: ${fields.filter((x) => x !== f).join(', ')}`;
      }
    }
  }

  return errors;
}

export function WrittenColumnMappingSettings() {
  const { entries, isLoading, isError, mutate } = useWrittenColumnMapping();
  const [draft, setDraft] = useState<DraftMap | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = draft !== null;
  const hasOverrides = entries.some((e) => e.isOverridden);

  function handleLetterChange(field: string, value: string) {
    setDraft((prev) => ({ ...(prev ?? {}), [field]: value.toUpperCase() }));
  }

  function resetField(field: string, hardcodedDefaultLetter: string) {
    setDraft((prev) => ({ ...(prev ?? {}), [field]: hardcodedDefaultLetter }));
  }

  function discard() {
    setDraft(null);
    setErrors({});
  }

  async function save() {
    if (!draft) return;
    const newErrors = validateDraft(entries, draft);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSaving(true);
    try {
      const fullMap: Record<string, number> = {};
      for (const entry of entries) {
        const letter = (draft[entry.field] ?? entry.colLetter).toUpperCase();
        fullMap[entry.field] = colLetterToIndex(letter);
      }

      const res = await fetch('/api/written-column-mapping', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides: fullMap }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Save failed');
      }
      await mutate();
      setDraft(null);
      setErrors({});
      toast.success('Written column mapping saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save written column mapping');
    } finally {
      setIsSaving(false);
    }
  }

  async function resetAll() {
    setIsSaving(true);
    try {
      const res = await fetch('/api/written-column-mapping', { method: 'DELETE' });
      if (!res.ok) throw new Error('Reset failed');
      await mutate();
      setDraft(null);
      setErrors({});
      toast.success('Reset to defaults');
    } catch {
      toast.error('Failed to reset');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-[hsl(var(--text-secondary))]">Loading…</p>;
  }

  if (isError) {
    return <p className="text-sm text-red-500">Failed to load written column mapping. Please refresh.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {isDirty && (
          <>
            <Button size="sm" onClick={save} disabled={isSaving}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={discard} disabled={isSaving}>
              Discard
            </Button>
          </>
        )}
        {!isDirty && hasOverrides && (
          <Button
            size="sm"
            variant="outline"
            onClick={resetAll}
            disabled={isSaving}
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset all to defaults
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[hsl(var(--border))] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
              <th className="px-3 py-2 text-left font-medium text-[hsl(var(--text-secondary))]">App Field</th>
              <th className="px-3 py-2 text-left font-medium text-[hsl(var(--text-secondary))] w-24">Column</th>
              <th className="px-3 py-2 text-left font-medium text-[hsl(var(--text-secondary))]">Sheet Header</th>
              <th className="px-3 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => {
              const currentLetter = draft?.[entry.field] ?? entry.colLetter;
              const error = errors[entry.field];
              const isModified = currentLetter !== entry.defaultColLetter;

              return (
                <tr
                  key={entry.field}
                  className={
                    i % 2 === 0
                      ? 'bg-[hsl(var(--background))]'
                      : 'bg-[hsl(var(--surface))]'
                  }
                >
                  <td className="px-3 py-1.5">
                    <span className="font-medium">{entry.fieldLabel}</span>
                    {isModified && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                        modified
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-1.5">
                    <div className="flex flex-col gap-0.5">
                      <Input
                        value={currentLetter}
                        onChange={(e) => handleLetterChange(entry.field, e.target.value)}
                        className={`h-7 w-16 text-center font-mono text-sm uppercase ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        maxLength={2}
                        aria-label={`Column letter for ${entry.fieldLabel}`}
                      />
                      {error && (
                        <span className="text-xs text-red-500">{error}</span>
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-1.5 text-[hsl(var(--text-secondary))]">
                    {entry.sheetHeader}
                  </td>

                  <td className="px-3 py-1.5">
                    {isModified && (
                      <button
                        onClick={() => resetField(entry.field, entry.defaultColLetter)}
                        title="Reset to default"
                        className="text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
