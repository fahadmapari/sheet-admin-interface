// components/written-products/written-product-filter-bar.tsx
'use client';

import { useMemo } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WrittenProduct } from '@/lib/types';

export interface WrittenProductFilters {
  search: string;
  countries: string[];
  tourTypes: string[];
}

export const DEFAULT_WP_FILTERS: WrittenProductFilters = {
  search: '',
  countries: [],
  tourTypes: [],
};

interface WrittenProductFilterBarProps {
  allProducts: WrittenProduct[];
  filters: WrittenProductFilters;
  onFiltersChange: (filters: WrittenProductFilters) => void;
}

export function WrittenProductFilterBar({
  allProducts,
  filters,
  onFiltersChange,
}: WrittenProductFilterBarProps) {
  const countryOptions = useMemo(
    () => [...new Set(allProducts.map((p) => p.country).filter(Boolean))].sort(),
    [allProducts],
  );

  const tourTypeOptions = useMemo(
    () => [...new Set(allProducts.map((p) => p.tourType).filter(Boolean))].sort(),
    [allProducts],
  );

  function toggleMulti(key: 'countries' | 'tourTypes', value: string) {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFiltersChange({ ...filters, [key]: next });
  }

  const hasActiveFilters =
    filters.search !== '' || filters.countries.length > 0 || filters.tourTypes.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Input
          placeholder="Search…"
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="h-8 w-52 text-sm pr-7"
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => onFiltersChange({ ...filters, search: '' })}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <MultiSelectDropdown
        label="Country"
        options={countryOptions}
        selected={filters.countries}
        onToggle={(v) => toggleMulti('countries', v)}
      />

      <MultiSelectDropdown
        label="Tour Type"
        options={tourTypeOptions}
        selected={filters.tourTypes}
        onToggle={(v) => toggleMulti('tourTypes', v)}
      />

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => onFiltersChange(DEFAULT_WP_FILTERS)}
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
          {label}
          {selected.length > 0 && (
            <Badge className="ml-1 h-4 px-1 text-[10px]">{selected.length}</Badge>
          )}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
        {options.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt}
            checked={selected.includes(opt)}
            onCheckedChange={() => onToggle(opt)}
          >
            {opt}
          </DropdownMenuCheckboxItem>
        ))}
        {options.length === 0 && (
          <div className="px-3 py-2 text-xs text-[hsl(var(--text-tertiary))]">No options</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
