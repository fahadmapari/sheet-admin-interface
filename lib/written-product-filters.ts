import type { WrittenProduct } from './types';

export type WPTriState = 'all' | 'yes' | 'no';

export interface WrittenProductFilters {
  search: string;
  countries: string[];
  states: string[];
  cities: string[];
  tourTypes: string[];
  ccOk: WPTriState;
  isOk: WPTriState;
  rrOk: WPTriState;
  ssOk: WPTriState;
  contentExist: WPTriState;
  b2b: WPTriState;
  b2c: WPTriState;
  ssNotes: WPTriState;
}

export const DEFAULT_WP_FILTERS: WrittenProductFilters = {
  search: '',
  countries: [],
  states: [],
  cities: [],
  tourTypes: [],
  ccOk: 'all',
  isOk: 'all',
  rrOk: 'all',
  ssOk: 'all',
  contentExist: 'all',
  b2b: 'all',
  b2c: 'all',
  ssNotes: 'all',
};

export const WP_FILTER_SECTIONS = ['Location', 'Status'] as const;
export type WPFilterSection = (typeof WP_FILTER_SECTIONS)[number];

export type WPMultiSelectKey = 'countries' | 'states' | 'cities' | 'tourTypes';
export type WPTriStateKey = 'ccOk' | 'isOk' | 'rrOk' | 'ssOk' | 'contentExist' | 'b2b' | 'b2c' | 'ssNotes';

export const WP_MULTI_SELECT_FILTERS: Array<{
  key: WPMultiSelectKey;
  productKey: keyof WrittenProduct;
  label: string;
  buttonLabel: string;
  section: WPFilterSection;
}> = [
  { key: 'countries', productKey: 'country', label: 'Country', buttonLabel: 'Select countries', section: 'Location' },
  { key: 'states', productKey: 'state', label: 'State', buttonLabel: 'Select states', section: 'Location' },
  { key: 'cities', productKey: 'cityDestination', label: 'City / Destination', buttonLabel: 'Select cities', section: 'Location' },
  { key: 'tourTypes', productKey: 'tourType', label: 'Tour Type', buttonLabel: 'Select tour types', section: 'Location' },
];

export const WP_TRI_STATE_FILTERS: Array<{
  key: WPTriStateKey;
  productKey: keyof WrittenProduct;
  label: string;
  chipLabel: string;
  section: WPFilterSection;
}> = [
  { key: 'ccOk', productKey: 'ccOk', label: 'CC OK', chipLabel: 'CC OK', section: 'Status' },
  { key: 'isOk', productKey: 'isOk', label: 'IS OK', chipLabel: 'IS OK', section: 'Status' },
  { key: 'rrOk', productKey: 'rrOk', label: 'RR OK', chipLabel: 'RR OK', section: 'Status' },
  { key: 'ssOk', productKey: 'ssOk', label: 'SS OK', chipLabel: 'SS OK', section: 'Status' },
  { key: 'contentExist', productKey: 'contentExist', label: 'Content Exist', chipLabel: 'Content Exist', section: 'Status' },
  { key: 'b2b', productKey: 'b2b', label: 'B2B', chipLabel: 'B2B', section: 'Status' },
  { key: 'b2c', productKey: 'b2c', label: 'B2C', chipLabel: 'B2C', section: 'Status' },
  { key: 'ssNotes', productKey: 'ssNotes', label: 'SS Notes', chipLabel: 'SS Notes', section: 'Status' },
];

export function getWPActiveFilterCount(filters: WrittenProductFilters): number {
  let count = 0;
  for (const f of WP_MULTI_SELECT_FILTERS) count += filters[f.key].length;
  for (const f of WP_TRI_STATE_FILTERS) { if (filters[f.key] !== 'all') count++; }
  return count;
}

export function getWPActiveFilterCountForSection(
  filters: WrittenProductFilters,
  section: WPFilterSection,
): number {
  let count = 0;
  for (const f of WP_MULTI_SELECT_FILTERS) {
    if (f.section === section) count += filters[f.key].length;
  }
  for (const f of WP_TRI_STATE_FILTERS) {
    if (f.section === section && filters[f.key] !== 'all') count++;
  }
  return count;
}
