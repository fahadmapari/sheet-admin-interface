'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { PRODUCT_STATUSES } from '@/lib/constants';
import type { FiltersResponse } from '@/lib/types';
import { fetcher } from '@/lib/fetcher';

export interface Filters {
  country: string;
  city: string;
  productTypes: string[];
  statuses: string[];
  readyForUpload: 'all' | 'yes' | 'no';
}

export const DEFAULT_FILTERS: Filters = {
  country: '',
  city: '',
  productTypes: [],
  statuses: [],
  readyForUpload: 'all',
};

interface FilterBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium text-[hsl(var(--text-tertiary))]">{label}</span>
      {children}
    </div>
  );
}

// Multi-select popover used for productTypes and statuses
function MultiSelectPopover({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const hasSelection = selected.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-1.5 ${hasSelection ? 'border-[hsl(var(--accent))] text-[hsl(var(--accent))]' : ''}`}
        >
          {label}
          {hasSelection && (
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[10px] font-medium text-[hsl(var(--accent-foreground))]">
              {selected.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="max-h-64 overflow-y-auto">
          <div className="p-2 space-y-0.5">
            {options.map((opt) => (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-[hsl(var(--surface))]"
              >
                <Checkbox
                  checked={selected.includes(opt)}
                  onCheckedChange={() => toggle(opt)}
                  className="h-3.5 w-3.5"
                />
                <span className="text-xs">{opt}</span>
              </label>
            ))}
          </div>
        </div>
        {hasSelection && (
          <>
            <Separator />
            <div className="p-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={() => onChange([])}
              >
                Clear
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const { data: filterOptions } = useSWR<FiltersResponse>('/api/filters', fetcher, {
    dedupingInterval: 300_000,
  });

  const countries = filterOptions?.countries ?? [];
  const cities = filterOptions?.cities ?? [];
  const productTypes = filterOptions?.productTypes ?? [];

  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const isActive =
    filters.country !== '' ||
    filters.city !== '' ||
    filters.productTypes.length > 0 ||
    filters.statuses.length > 0 ||
    filters.readyForUpload !== 'all';

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3">
      <FilterField label="Country">
        <Select
          value={filters.country || '__all__'}
          onValueChange={(v) => update('country', v === '__all__' ? '' : v)}
        >
          <SelectTrigger
            className={`w-[148px] ${filters.country ? 'border-[hsl(var(--accent))] text-[hsl(var(--accent))]' : ''}`}
          >
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">
              All Countries
            </SelectItem>
            {countries.map((c) => (
              <SelectItem key={c} value={c} className="text-xs">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="City">
        <Select
          value={filters.city || '__all__'}
          onValueChange={(v) => update('city', v === '__all__' ? '' : v)}
        >
          <SelectTrigger
            className={`w-[148px] ${filters.city ? 'border-[hsl(var(--accent))] text-[hsl(var(--accent))]' : ''}`}
          >
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-xs">
              All Cities
            </SelectItem>
            {cities.map((c) => (
              <SelectItem key={c} value={c} className="text-xs">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Product Type">
        <MultiSelectPopover
          label="Product Type"
          options={productTypes}
          selected={filters.productTypes}
          onChange={(v) => update('productTypes', v)}
        />
      </FilterField>

      {/* Status multi-select */}
      <FilterField label="Status">
        <MultiSelectPopover
          label="Status"
          options={[...PRODUCT_STATUSES]}
          selected={filters.statuses}
          onChange={(v) => update('statuses', v)}
        />
      </FilterField>

      <FilterField label="Ready for Upload">
        <div className="flex h-8 items-center overflow-hidden rounded-md border border-[hsl(var(--border))] text-xs">
          {(['all', 'yes', 'no'] as const).map((val, idx) => (
            <button
              key={val}
              onClick={() => update('readyForUpload', val)}
              className={`px-3 h-full text-xs transition-colors ${
                filters.readyForUpload === val
                  ? 'bg-[hsl(var(--text-primary))] font-medium text-[hsl(var(--background))]'
                  : 'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--surface))] hover:text-[hsl(var(--text-primary))]'
              } ${idx > 0 ? 'border-l border-[hsl(var(--border))]' : ''}`}
            >
              {val === 'all' ? 'All' : val === 'yes' ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </FilterField>

      {isActive && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-8 gap-1.5"
          onClick={() => onFiltersChange(DEFAULT_FILTERS)}
        >
          <X className="h-3 w-3" />
          Clear All
        </Button>
      )}
    </div>
  );
}
