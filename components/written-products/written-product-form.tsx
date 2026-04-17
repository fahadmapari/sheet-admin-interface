// components/written-products/written-product-form.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { WrittenProduct } from '@/lib/types';

type FormData = Omit<WrittenProduct, 'rowIndex'>;

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

const EMPTY: FormData = {
  country: '',
  cityDestination: '',
  state: '',
  tourType: '',
  textLink: '',
  ccOk: false,
  isOk: false,
  rrOk: false,
  ssOk: false,
  contentExist: false,
  b2b: false,
  b2c: false,
  ssNotes: false,
};

interface WrittenProductFormProps {
  initialData?: FormData;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
  isSubmitting: boolean;
}

export function WrittenProductForm({
  initialData,
  onSubmit,
  onCancel,
  onDelete,
  isSubmitting,
}: WrittenProductFormProps) {
  const [form, setForm] = useState<FormData>(initialData ?? EMPTY);

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {(
          [
            { key: 'country', label: 'Country' },
            { key: 'cityDestination', label: 'City / Destination' },
            { key: 'state', label: 'State' },
            { key: 'tourType', label: 'Tour Type' },
          ] as const
        ).map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <Label htmlFor={key} className="text-sm">
              {label}
            </Label>
            <Input
              id={key}
              value={form[key]}
              onChange={(e) => setField(key, e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <Label htmlFor="textLink" className="text-sm">
          Text Link <span className="text-destructive">*</span>
        </Label>
        <Input
          id="textLink"
          value={form.textLink}
          onChange={(e) => setField('textLink', e.target.value)}
          className="h-8 text-sm"
          required
        />
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
    </form>
  );
}
