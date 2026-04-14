'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { PRODUCT_STATUSES } from '@/lib/constants';
import type { FiltersResponse } from '@/lib/types';
import { fetcher } from '@/lib/fetcher';

export type TriState = 'all' | 'yes' | 'no';
export type PresenceState = 'all' | 'has' | 'missing';

export interface Filters {
  country: string[];
  city: string[];
  departments: string[];
  regions: string[];
  productTypes: string[];
  durations: string[];
  statuses: string[];
  isOkValues: string[];
  maxPaxValues: string[];
  guideWhereValues: string[];
  transportationValues: string[];
  vatValues: string[];
  vatPercentValues: string[];
  cancellationValues: string[];
  pics: string[];
  uploadedPics: string[];
  otaMasterSheetValues: string[];
  otaTravmondeValues: string[];
  otaBookableToursValues: string[];
  otaViatorValues: string[];
  otaGygValues: string[];
  otaHotelbedsValues: string[];
  otaProjectExpeditionValues: string[];
  otaAirbnbValues: string[];
  otaBokunValues: string[];
  otaTrekksoftValues: string[];
  otaTuiMusementValues: string[];
  otaKlookValues: string[];
  otaToristyValues: string[];
  otaTourHQValues: string[];
  readyForUpload: TriState;
  written: TriState;
  ssOk: TriState;
  guide: TriState;
  driver: TriState;
  driverGuide: TriState;
  attractionIncluded: TriState;
  attractionOptional: TriState;
  linkPresence: PresenceState;
  productNamePresence: PresenceState;
  notesPresence: PresenceState;
  isOkPresence: PresenceState;
  imageLinksPresence: PresenceState;
  componentsOfTourPresence: PresenceState;
  attractionsIncludedPresence: PresenceState;
  attractionLinkPresence: PresenceState;
  providerPricePresence: PresenceState;
  providerUrlPresence: PresenceState;
  centralProviderLinksPresence: PresenceState;
  centralTransportLinksPresence: PresenceState;
  transportationPricePresence: PresenceState;
  totalBuyingPricePresence: PresenceState;
  b2bPriceInstantPresence: PresenceState;
  b2bPriceOnRequestPresence: PresenceState;
  b2cPriceInstantPresence: PresenceState;
  b2cPriceOnRequestPresence: PresenceState;
  extraHrB2BInstantPresence: PresenceState;
  extraHrB2BRequestPresence: PresenceState;
  extraHrB2CInstantPresence: PresenceState;
  extraHrB2CRequestPresence: PresenceState;
  tourValidityGeneralPresence: PresenceState;
  tourValiditySpecificPresence: PresenceState;
  cancelInstantPresence: PresenceState;
  cutoffInstantPresence: PresenceState;
  cancelOnRequestPresence: PresenceState;
  cutoffOnRequestPresence: PresenceState;
  notesGeneralPresence: PresenceState;
  otaMasterSheetPresence: PresenceState;
  otaTravmondePresence: PresenceState;
  otaBookableToursPresence: PresenceState;
  otaViatorPresence: PresenceState;
  otaGygPresence: PresenceState;
  otaHotelbedsPresence: PresenceState;
  otaProjectExpeditionPresence: PresenceState;
  otaAirbnbPresence: PresenceState;
  otaBokunPresence: PresenceState;
  otaTrekksoftPresence: PresenceState;
  otaTuiMusementPresence: PresenceState;
  otaKlookPresence: PresenceState;
  otaToristyPresence: PresenceState;
  otaTourHQPresence: PresenceState;
  qualityRemarksPresence: PresenceState;
  dateOfDispatchPresence: PresenceState;
  dateUploadedPresence: PresenceState;
  productLinkPresence: PresenceState;
}

export const DEFAULT_FILTERS: Filters = {
  country: [],
  city: [],
  departments: [],
  regions: [],
  productTypes: [],
  durations: [],
  statuses: [],
  isOkValues: [],
  maxPaxValues: [],
  guideWhereValues: [],
  transportationValues: [],
  vatValues: [],
  vatPercentValues: [],
  cancellationValues: [],
  pics: [],
  uploadedPics: [],
  otaMasterSheetValues: [],
  otaTravmondeValues: [],
  otaBookableToursValues: [],
  otaViatorValues: [],
  otaGygValues: [],
  otaHotelbedsValues: [],
  otaProjectExpeditionValues: [],
  otaAirbnbValues: [],
  otaBokunValues: [],
  otaTrekksoftValues: [],
  otaTuiMusementValues: [],
  otaKlookValues: [],
  otaToristyValues: [],
  otaTourHQValues: [],
  readyForUpload: 'all',
  written: 'all',
  ssOk: 'all',
  guide: 'all',
  driver: 'all',
  driverGuide: 'all',
  attractionIncluded: 'all',
  attractionOptional: 'all',
  linkPresence: 'all',
  productNamePresence: 'all',
  notesPresence: 'all',
  isOkPresence: 'all',
  imageLinksPresence: 'all',
  componentsOfTourPresence: 'all',
  attractionsIncludedPresence: 'all',
  attractionLinkPresence: 'all',
  providerPricePresence: 'all',
  providerUrlPresence: 'all',
  centralProviderLinksPresence: 'all',
  centralTransportLinksPresence: 'all',
  transportationPricePresence: 'all',
  totalBuyingPricePresence: 'all',
  b2bPriceInstantPresence: 'all',
  b2bPriceOnRequestPresence: 'all',
  b2cPriceInstantPresence: 'all',
  b2cPriceOnRequestPresence: 'all',
  extraHrB2BInstantPresence: 'all',
  extraHrB2BRequestPresence: 'all',
  extraHrB2CInstantPresence: 'all',
  extraHrB2CRequestPresence: 'all',
  tourValidityGeneralPresence: 'all',
  tourValiditySpecificPresence: 'all',
  cancelInstantPresence: 'all',
  cutoffInstantPresence: 'all',
  cancelOnRequestPresence: 'all',
  cutoffOnRequestPresence: 'all',
  notesGeneralPresence: 'all',
  otaMasterSheetPresence: 'all',
  otaTravmondePresence: 'all',
  otaBookableToursPresence: 'all',
  otaViatorPresence: 'all',
  otaGygPresence: 'all',
  otaHotelbedsPresence: 'all',
  otaProjectExpeditionPresence: 'all',
  otaAirbnbPresence: 'all',
  otaBokunPresence: 'all',
  otaTrekksoftPresence: 'all',
  otaTuiMusementPresence: 'all',
  otaKlookPresence: 'all',
  otaToristyPresence: 'all',
  otaTourHQPresence: 'all',
  qualityRemarksPresence: 'all',
  dateOfDispatchPresence: 'all',
  dateUploadedPresence: 'all',
  productLinkPresence: 'all',
};

interface FilterBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

function FilterSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--text-tertiary))]">
        {label}
      </span>
      {children}
    </div>
  );
}

function MultiSelectPopover({
  label,
  options,
  selected,
  onChange,
  searchable = false,
  emptyMessage = 'No results found.',
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
  emptyMessage?: string;
}) {
  const [query, setQuery] = useState('');

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const hasSelection = selected.length > 0;
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((opt) => opt.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`justify-between gap-1.5 ${hasSelection ? 'border-[hsl(var(--accent))] text-[hsl(var(--accent))]' : ''}`}
        >
          {label}
          {hasSelection && (
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[10px] font-medium text-[hsl(var(--accent-foreground))]">
              {selected.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        {searchable && (
          <div className="border-b border-[hsl(var(--border))] p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              className="flex h-8 w-full rounded-md border border-[hsl(var(--border))] bg-transparent px-2 text-xs shadow-sm outline-none transition-colors placeholder:text-[hsl(var(--text-tertiary))] focus-visible:ring-1 focus-visible:ring-[hsl(var(--ring))]"
            />
          </div>
        )}
        <div className="max-h-64 overflow-y-auto">
          <div className="p-2 space-y-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
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
              ))
            ) : (
              <div className="px-1 py-3 text-xs text-[hsl(var(--text-tertiary))]">{emptyMessage}</div>
            )}
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

function TriStateToggle({
  value,
  onChange,
}: {
  value: TriState;
  onChange: (v: TriState) => void;
}) {
  return (
    <div className="flex h-8 w-fit self-start items-center overflow-hidden rounded-md border border-[hsl(var(--border))] text-xs">
      {(['all', 'yes', 'no'] as const).map((val, idx) => (
        <button
          key={val}
          onClick={() => onChange(val)}
          className={`px-3 h-full text-xs transition-colors ${
            value === val
              ? 'bg-[hsl(var(--text-primary))] font-medium text-[hsl(var(--background))]'
              : 'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--surface))] hover:text-[hsl(var(--text-primary))]'
          } ${idx > 0 ? 'border-l border-[hsl(var(--border))]' : ''}`}
        >
          {val === 'all' ? 'All' : val === 'yes' ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  );
}

function PresenceToggle({
  value,
  onChange,
}: {
  value: PresenceState;
  onChange: (v: PresenceState) => void;
}) {
  return (
    <div className="flex h-8 w-fit self-start items-center overflow-hidden rounded-md border border-[hsl(var(--border))] text-xs">
      {(['all', 'has', 'missing'] as const).map((val, idx) => (
        <button
          key={val}
          onClick={() => onChange(val)}
          className={`px-3 h-full text-xs transition-colors ${
            value === val
              ? 'bg-[hsl(var(--text-primary))] font-medium text-[hsl(var(--background))]'
              : 'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--surface))] hover:text-[hsl(var(--text-primary))]'
          } ${idx > 0 ? 'border-l border-[hsl(var(--border))]' : ''}`}
        >
          {val === 'all' ? 'All' : val === 'has' ? 'Has' : 'Missing'}
        </button>
      ))}
    </div>
  );
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/10 px-2 py-0.5 text-xs font-medium text-[hsl(var(--accent))]">
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 hover:bg-[hsl(var(--accent))]/20 transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

type OptionFilterKey = {
  [K in keyof Filters]: Filters[K] extends string[] ? K : never
}[keyof Filters];

type TriStateFilterKey = {
  [K in keyof Filters]: Filters[K] extends TriState ? K : never
}[keyof Filters];

type PresenceFilterKey = {
  [K in keyof Filters]: Filters[K] extends PresenceState ? K : never
}[keyof Filters];

type FilterOptionKey = keyof FiltersResponse;

const MULTI_SELECT_FILTERS: Array<{
  key: OptionFilterKey;
  responseKey: FilterOptionKey;
  label: string;
  buttonLabel: string;
  section: string;
  searchable?: boolean;
}> = [
  { key: 'country', responseKey: 'countries', label: 'Country', buttonLabel: 'Select countries', section: 'Location', searchable: true },
  { key: 'city', responseKey: 'cities', label: 'City', buttonLabel: 'Select cities', section: 'Location', searchable: true },
  { key: 'departments', responseKey: 'departments', label: 'Department', buttonLabel: 'Select departments', section: 'Location', searchable: true },
  { key: 'regions', responseKey: 'regions', label: 'Region', buttonLabel: 'Select regions', section: 'Location', searchable: true },
  { key: 'productTypes', responseKey: 'productTypes', label: 'Product Type', buttonLabel: 'Select types', section: 'Product', searchable: true },
  { key: 'durations', responseKey: 'durations', label: 'Duration', buttonLabel: 'Select durations', section: 'Product', searchable: true },
  { key: 'statuses', responseKey: 'statuses', label: 'Status', buttonLabel: 'Select statuses', section: 'Product' },
  { key: 'pics', responseKey: 'pics', label: 'PIC', buttonLabel: 'Select PICs', section: 'Product' },
  { key: 'isOkValues', responseKey: 'isOkValues', label: 'IS OK Value', buttonLabel: 'Select values', section: 'Content', searchable: true },
  { key: 'maxPaxValues', responseKey: 'maxPaxValues', label: 'Max Pax', buttonLabel: 'Select pax', section: 'Tour Setup' },
  { key: 'guideWhereValues', responseKey: 'guideWhereValues', label: 'Guide Where', buttonLabel: 'Select values', section: 'Tour Setup', searchable: true },
  { key: 'transportationValues', responseKey: 'transportationValues', label: 'Transportation', buttonLabel: 'Select transport', section: 'Tour Setup', searchable: true },
  { key: 'vatValues', responseKey: 'vatValues', label: 'VAT', buttonLabel: 'Select VAT values', section: 'Buying' },
  { key: 'vatPercentValues', responseKey: 'vatPercentValues', label: 'VAT %', buttonLabel: 'Select VAT %', section: 'Buying' },
  { key: 'cancellationValues', responseKey: 'cancellationValues', label: 'Cancellation', buttonLabel: 'Select values', section: 'Buying', searchable: true },
  { key: 'otaMasterSheetValues', responseKey: 'otaMasterSheetValues', label: 'OTA Master Sheet Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaTravmondeValues', responseKey: 'otaTravmondeValues', label: 'Travmonde Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaBookableToursValues', responseKey: 'otaBookableToursValues', label: 'Bookable Tours Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaViatorValues', responseKey: 'otaViatorValues', label: 'Viator Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaGygValues', responseKey: 'otaGygValues', label: 'GYG Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaHotelbedsValues', responseKey: 'otaHotelbedsValues', label: 'Hotelbeds Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaProjectExpeditionValues', responseKey: 'otaProjectExpeditionValues', label: 'Project Expedition Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaAirbnbValues', responseKey: 'otaAirbnbValues', label: 'Airbnb Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaBokunValues', responseKey: 'otaBokunValues', label: 'Bokun Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaTrekksoftValues', responseKey: 'otaTrekksoftValues', label: 'Trekksoft Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaTuiMusementValues', responseKey: 'otaTuiMusementValues', label: 'TUI/Musement Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaKlookValues', responseKey: 'otaKlookValues', label: 'Klook Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaToristyValues', responseKey: 'otaToristyValues', label: 'Toristy Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaTourHQValues', responseKey: 'otaTourHQValues', label: 'TourHQ Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'uploadedPics', responseKey: 'uploadedPics', label: 'Uploaded PIC', buttonLabel: 'Select uploaded PICs', section: 'Upload' },
];

const TRI_STATE_FILTERS: Array<{ key: TriStateFilterKey; label: string; chipLabel: string; section: string }> = [
  { key: 'written', label: 'Written', chipLabel: 'Written', section: 'Content' },
  { key: 'ssOk', label: 'SS OK', chipLabel: 'SS OK', section: 'Content' },
  { key: 'guide', label: 'Guide', chipLabel: 'Guide', section: 'Tour Setup' },
  { key: 'driver', label: 'Driver', chipLabel: 'Driver', section: 'Tour Setup' },
  { key: 'driverGuide', label: 'Driver-Guide', chipLabel: 'Driver-Guide', section: 'Tour Setup' },
  { key: 'attractionIncluded', label: 'Attraction Included', chipLabel: 'Attraction Included', section: 'Tour Setup' },
  { key: 'attractionOptional', label: 'Attraction Optional', chipLabel: 'Attraction Optional', section: 'Tour Setup' },
  { key: 'readyForUpload', label: 'Ready for Upload', chipLabel: 'Ready', section: 'Upload' },
];

const PRESENCE_FILTERS: Array<{ key: PresenceFilterKey; label: string; chipLabel: string; section: string }> = [
  { key: 'linkPresence', label: 'Link / Title', chipLabel: 'Link', section: 'Product' },
  { key: 'productNamePresence', label: 'Product Name', chipLabel: 'Product Name', section: 'Product' },
  { key: 'notesPresence', label: 'Notes', chipLabel: 'Notes', section: 'Content' },
  { key: 'isOkPresence', label: 'IS OK Filled', chipLabel: 'IS OK', section: 'Content' },
  { key: 'imageLinksPresence', label: 'Image Links', chipLabel: 'Image Links', section: 'Content' },
  { key: 'componentsOfTourPresence', label: 'Components of Tour', chipLabel: 'Components', section: 'Tour Setup' },
  { key: 'attractionsIncludedPresence', label: 'Attractions Included', chipLabel: 'Attractions', section: 'Tour Setup' },
  { key: 'attractionLinkPresence', label: 'Attraction Link', chipLabel: 'Attraction Link', section: 'Tour Setup' },
  { key: 'providerPricePresence', label: 'Provider Price', chipLabel: 'Provider Price', section: 'Buying' },
  { key: 'providerUrlPresence', label: 'Provider URL', chipLabel: 'Provider URL', section: 'Buying' },
  { key: 'centralProviderLinksPresence', label: 'Central Provider Links', chipLabel: 'Central Provider Links', section: 'Buying' },
  { key: 'centralTransportLinksPresence', label: 'Central Transport Links', chipLabel: 'Central Transport Links', section: 'Buying' },
  { key: 'transportationPricePresence', label: 'Transportation Price', chipLabel: 'Transport Price', section: 'Buying' },
  { key: 'totalBuyingPricePresence', label: 'Total Buying Price', chipLabel: 'Buying Price', section: 'Buying' },
  { key: 'b2bPriceInstantPresence', label: 'B2B Price Instant', chipLabel: 'B2B Instant', section: 'Selling' },
  { key: 'b2bPriceOnRequestPresence', label: 'B2B Price On Request', chipLabel: 'B2B On Request', section: 'Selling' },
  { key: 'b2cPriceInstantPresence', label: 'B2C Price Instant', chipLabel: 'B2C Instant', section: 'Selling' },
  { key: 'b2cPriceOnRequestPresence', label: 'B2C Price On Request', chipLabel: 'B2C On Request', section: 'Selling' },
  { key: 'extraHrB2BInstantPresence', label: 'Extra Hr B2B Instant', chipLabel: 'Extra Hr B2B Instant', section: 'Selling' },
  { key: 'extraHrB2BRequestPresence', label: 'Extra Hr B2B Request', chipLabel: 'Extra Hr B2B Request', section: 'Selling' },
  { key: 'extraHrB2CInstantPresence', label: 'Extra Hr B2C Instant', chipLabel: 'Extra Hr B2C Instant', section: 'Selling' },
  { key: 'extraHrB2CRequestPresence', label: 'Extra Hr B2C Request', chipLabel: 'Extra Hr B2C Request', section: 'Selling' },
  { key: 'tourValidityGeneralPresence', label: 'Tour Validity General', chipLabel: 'Validity General', section: 'Validity' },
  { key: 'tourValiditySpecificPresence', label: 'Tour Validity Specific', chipLabel: 'Validity Specific', section: 'Validity' },
  { key: 'cancelInstantPresence', label: 'Cancel Instant', chipLabel: 'Cancel Instant', section: 'Validity' },
  { key: 'cutoffInstantPresence', label: 'Cutoff Instant', chipLabel: 'Cutoff Instant', section: 'Validity' },
  { key: 'cancelOnRequestPresence', label: 'Cancel On Request', chipLabel: 'Cancel On Request', section: 'Validity' },
  { key: 'cutoffOnRequestPresence', label: 'Cutoff On Request', chipLabel: 'Cutoff On Request', section: 'Validity' },
  { key: 'notesGeneralPresence', label: 'Notes General', chipLabel: 'Notes General', section: 'Notes' },
  { key: 'otaMasterSheetPresence', label: 'OTA Master Sheet', chipLabel: 'OTA Master Sheet', section: 'OTA' },
  { key: 'otaTravmondePresence', label: 'Travmonde', chipLabel: 'Travmonde', section: 'OTA' },
  { key: 'otaBookableToursPresence', label: 'Bookable Tours', chipLabel: 'Bookable Tours', section: 'OTA' },
  { key: 'otaViatorPresence', label: 'Viator', chipLabel: 'Viator', section: 'OTA' },
  { key: 'otaGygPresence', label: 'GYG', chipLabel: 'GYG', section: 'OTA' },
  { key: 'otaHotelbedsPresence', label: 'Hotelbeds', chipLabel: 'Hotelbeds', section: 'OTA' },
  { key: 'otaProjectExpeditionPresence', label: 'Project Expedition', chipLabel: 'Project Expedition', section: 'OTA' },
  { key: 'otaAirbnbPresence', label: 'Airbnb', chipLabel: 'Airbnb', section: 'OTA' },
  { key: 'otaBokunPresence', label: 'Bokun', chipLabel: 'Bokun', section: 'OTA' },
  { key: 'otaTrekksoftPresence', label: 'Trekksoft', chipLabel: 'Trekksoft', section: 'OTA' },
  { key: 'otaTuiMusementPresence', label: 'TUI/Musement', chipLabel: 'TUI/Musement', section: 'OTA' },
  { key: 'otaKlookPresence', label: 'Klook', chipLabel: 'Klook', section: 'OTA' },
  { key: 'otaToristyPresence', label: 'Toristy', chipLabel: 'Toristy', section: 'OTA' },
  { key: 'otaTourHQPresence', label: 'TourHQ', chipLabel: 'TourHQ', section: 'OTA' },
  { key: 'qualityRemarksPresence', label: 'Quality Remarks', chipLabel: 'Quality Remarks', section: 'Upload' },
  { key: 'dateOfDispatchPresence', label: 'Date of Dispatch', chipLabel: 'Dispatch Date', section: 'Upload' },
  { key: 'dateUploadedPresence', label: 'Date Uploaded', chipLabel: 'Upload Date', section: 'Upload' },
  { key: 'productLinkPresence', label: 'Product Link', chipLabel: 'Product Link', section: 'Upload' },
];

const FILTER_SECTIONS = [
  'Location',
  'Product',
  'Content',
  'Tour Setup',
  'Buying',
  'Selling',
  'Validity',
  'Notes',
  'OTA',
  'Upload',
];

function getTriStateChipValue(value: TriState) {
  return value === 'yes' ? 'Yes' : 'No';
}

function getPresenceChipValue(value: PresenceState) {
  return value === 'has' ? 'Has value' : 'Missing';
}

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const { data: filterOptions } = useSWR<FiltersResponse>('/api/filters', fetcher, {
    dedupingInterval: 300_000,
  });

  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const activeCount = Object.values(filters).reduce((count, value) => {
    if (Array.isArray(value)) return count + value.length;
    return value === 'all' ? count : count + 1;
  }, 0);

  const isActive = activeCount > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Trigger button */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`gap-1.5 ${isActive ? 'border-[hsl(var(--accent))] text-[hsl(var(--accent))]' : ''}`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {isActive && (
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[10px] font-medium text-[hsl(var(--accent-foreground))]">
                {activeCount}
              </span>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent side="right" style={{ width: '350px', maxWidth: '350px' }} className="flex flex-col gap-0 p-0">
          <SheetHeader className="flex flex-row items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4">
            <SheetTitle>Filters</SheetTitle>
            {isActive && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))]"
                onClick={() => onFiltersChange(DEFAULT_FILTERS)}
              >
                Clear all
              </Button>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col divide-y divide-[hsl(var(--border))]">
              {FILTER_SECTIONS.map((section) => {
                const multiSelects = MULTI_SELECT_FILTERS.filter((filter) => filter.section === section);
                const triStates = TRI_STATE_FILTERS.filter((filter) => filter.section === section);
                const presenceFilters = PRESENCE_FILTERS.filter((filter) => filter.section === section);
                if (!multiSelects.length && !triStates.length && !presenceFilters.length) return null;

                return (
                  <div key={section} className="px-5 py-4">
                    <div className="mb-3 text-sm font-semibold text-[hsl(var(--text-primary))]">{section}</div>
                    <div className="flex flex-col gap-4">
                      {multiSelects.map((filter) => {
                        const options =
                          filter.key === 'statuses'
                            ? [...new Set([...PRODUCT_STATUSES, ...(filterOptions?.[filter.responseKey] ?? [])])]
                            : filterOptions?.[filter.responseKey] ?? [];
                        return (
                          <FilterSection key={filter.key} label={filter.label}>
                            <MultiSelectPopover
                              label={filter.buttonLabel}
                              options={options}
                              selected={filters[filter.key]}
                              onChange={(v) => update(filter.key, v)}
                              searchable={filter.searchable}
                              emptyMessage={`No ${filter.label.toLowerCase()} values found.`}
                            />
                          </FilterSection>
                        );
                      })}
                      {triStates.map((filter) => (
                        <FilterSection key={filter.key} label={filter.label}>
                          <TriStateToggle value={filters[filter.key]} onChange={(v) => update(filter.key, v)} />
                        </FilterSection>
                      ))}
                      {presenceFilters.map((filter) => (
                        <FilterSection key={filter.key} label={filter.label}>
                          <PresenceToggle value={filters[filter.key]} onChange={(v) => update(filter.key, v)} />
                        </FilterSection>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Active filter chips */}
      {MULTI_SELECT_FILTERS.flatMap((filter) =>
        filters[filter.key].map((value) => (
          <ActiveChip
            key={`${filter.key}-${value}`}
            label={`${filter.label}: ${value}`}
            onRemove={() => update(filter.key, filters[filter.key].filter((current) => current !== value))}
          />
        ))
      )}
      {TRI_STATE_FILTERS.map((filter) =>
        filters[filter.key] !== 'all' ? (
          <ActiveChip
            key={filter.key}
            label={`${filter.chipLabel}: ${getTriStateChipValue(filters[filter.key])}`}
            onRemove={() => update(filter.key, 'all')}
          />
        ) : null
      )}
      {PRESENCE_FILTERS.map((filter) =>
        filters[filter.key] !== 'all' ? (
          <ActiveChip
            key={filter.key}
            label={`${filter.chipLabel}: ${getPresenceChipValue(filters[filter.key])}`}
            onRemove={() => update(filter.key, 'all')}
          />
        ) : null
      )}

      {isActive && (
        <button
          onClick={() => onFiltersChange(DEFAULT_FILTERS)}
          className="text-xs text-[hsl(var(--text-tertiary))] underline underline-offset-2 hover:text-[hsl(var(--text-primary))] transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
