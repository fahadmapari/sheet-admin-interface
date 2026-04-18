// components/written-products/written-product-form.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ComboboxInput } from '@/components/ui/combobox-input';
import type { WrittenProduct } from '@/lib/types';
import { parseLinkField } from '@/lib/utils';

type FormData = Omit<WrittenProduct, 'rowIndex'>;

type InternalForm = FormData & { textLinkUrl: string };

const BOOLEAN_FIELDS = [
  { key: 'ccOk', label: 'CC OK' },
  { key: 'isOk', label: 'IS OK' },
  { key: 'rrOk', label: 'RR OK' },
  { key: 'ssOk', label: 'SS OK' },
  { key: 'contentExist', label: 'Content Exist' },
  { key: 'b2b', label: 'B2B' },
  { key: 'b2c', label: 'B2C' },
  { key: 'ssNotes', label: 'SS Notes' },
] as const;

const EMPTY: InternalForm = {
  country: '',
  cityDestination: '',
  state: '',
  tourType: '',
  textLink: '',
  textLinkUrl: '',
  ccOk: false,
  isOk: false,
  rrOk: false,
  ssOk: false,
  contentExist: false,
  b2b: false,
  b2c: false,
  ssNotes: false,
};

function toInternalForm(data: FormData): InternalForm {
  const { text, url } = parseLinkField(data.textLink || '');
  return { ...data, textLink: text || data.textLink, textLinkUrl: url };
}

interface WrittenProductFormProps {
  formId?: string;
  hideActions?: boolean;
  initialData?: FormData;
  existingTitles?: Set<string>;
  suggestions?: {
    country?: string[];
    cityDestination?: string[];
    tourType?: string[];
  };
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
  isSubmitting: boolean;
}

export function WrittenProductForm({
  formId,
  hideActions,
  initialData,
  existingTitles,
  suggestions,
  onSubmit,
  onCancel,
  onDelete,
  isSubmitting,
}: WrittenProductFormProps) {
  const [form, setForm] = useState<InternalForm>(
    initialData ? toInternalForm(initialData) : EMPTY
  );
  const [titleError, setTitleError] = useState<string | null>(null);

  function setField<K extends keyof InternalForm>(key: K, value: InternalForm[K]) {
    if (key === 'textLink') setTitleError(null);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (existingTitles && existingTitles.has(form.textLink.trim().toLowerCase())) {
      setTitleError('A written product with this title already exists');
      return;
    }
    const { textLinkUrl, ...rest } = form;
    const textLink = textLinkUrl ? `${rest.textLink}||${textLinkUrl}` : rest.textLink;
    await onSubmit({ ...rest, textLink });
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {(
          [
            { key: 'country', label: 'Country', required: true },
            { key: 'cityDestination', label: 'City / Destination', required: true },
            { key: 'state', label: 'State', required: false },
            { key: 'tourType', label: 'Tour Type', required: true },
          ] as const
        ).map(({ key, label, required }) => {
          const opts =
            key === 'country' ? suggestions?.country :
            key === 'cityDestination' ? suggestions?.cityDestination :
            key === 'tourType' ? suggestions?.tourType :
            undefined;
          return (
            <div key={key} className="space-y-1">
              <Label htmlFor={key} className="text-sm">
                {label}{required && <span className="text-destructive"> *</span>}
              </Label>
              {opts && opts.length > 0 ? (
                <ComboboxInput
                  id={key}
                  value={form[key]}
                  onChange={(v) => setField(key, v)}
                  options={opts}
                  className="h-8 text-sm"
                  required={required}
                />
              ) : (
                <Input
                  id={key}
                  value={form[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  className="h-8 text-sm"
                  required={required}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="textLink" className="text-sm">
            Link / Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="textLink"
            value={form.textLink}
            onChange={(e) => setField('textLink', e.target.value)}
            className="h-8 text-sm"
            required
          />
          {titleError && (
            <p className="text-xs text-destructive">{titleError}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="textLinkUrl" className="text-sm">URL</Label>
          <Input
            id="textLinkUrl"
            value={form.textLinkUrl}
            onChange={(e) => setField('textLinkUrl', e.target.value)}
            className="h-8 text-sm"
            placeholder="https://"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 pt-1">
        {BOOLEAN_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <Checkbox
              id={key}
              checked={form[key]}
              onCheckedChange={(checked) => setField(key, checked === true)}
            />
            <Label htmlFor={key} className="text-sm cursor-pointer">
              {label}
            </Label>
          </div>
        ))}
      </div>

      {!hideActions && (
        <div className="flex gap-2 justify-between pt-2">
          <div>
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={onDelete}
                disabled={isSubmitting}
              >
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
