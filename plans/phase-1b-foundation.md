# Phase 1b — Foundation (Types, API Routes, Basic Table)

## Status
- Task 1 ✅ Next.js 14 scaffold (TypeScript, Tailwind, shadcn/ui)
- Task 2 ✅ Google Sheets API wrapper (`lib/sheets.ts`)
- **Task 3** — Type definitions & column mapping ← start here
- **Task 4** — API routes: GET all products, GET filters
- **Task 5** — Basic products table page (read-only, all 70 columns)

## Context

Working directory: `e:/projects/sheet-admin`
Framework: Next.js 14 App Router, TypeScript strict, Tailwind CSS, shadcn/ui (New York/Zinc)
Google Sheets: ~2,950 rows, 70 columns, sheet name "NET RATES", second sheet "Inventory Update"
`lib/sheets.ts` is fully built — exports: `fetchAllRows`, `fetchRow`, `updateRow`, `updateCell`, `appendRow`, `deleteRow`, `batchUpdateRows`, `fetchInventoryUpdate`

Run `npm install` if node_modules is missing. TypeScript must stay clean (`npx tsc --noEmit`).

---

## Task 3 — Type Definitions & Column Mapping

### Files to create
- `lib/types.ts`
- `lib/constants.ts`
- `lib/utils.ts` (extend existing — add data-normalisation helpers)

---

### `lib/types.ts`

```typescript
// Full 70-column TourProduct interface
export interface TourProduct {
  // Internal tracking (not a sheet column)
  rowIndex: number; // 1-based sheet row number (row 1 = header, row 2 = first data row)

  // === LOCATION & IDENTITY (Cols 0-4) ===
  country: string;
  city: string;
  department: string | null;
  region: string | null;
  productType: string;

  // === PRODUCT INFO (Cols 5-10) ===
  link: string | null;
  duration: string | null;
  productStatus: string | null;
  productName: string | null;
  written: boolean;
  notes: string | null;

  // === CONTENT STATUS (Cols 11-13) ===
  isOk: string | null;
  ssOk: boolean;
  imageLinks: string | null;

  // === TOUR CONFIGURATION (Cols 14-24) ===
  maxPax: string | null;
  guide: boolean;
  driver: boolean;
  driverGuide: boolean;
  guideWhere: string | null;
  componentsOfTour: string | null;
  attractionIncluded: boolean;
  attractionOptional: boolean;
  transportation: string | null;
  attractionsIncluded: string | null;
  attractionLink: string | null;

  // === PROVIDER / BUYING (Cols 25-33) ===
  providerPrice: string | null;
  providerUrl: string | null;
  centralProviderLinks: string | null;
  centralTransportLinks: string | null;
  transportationPrice: string | null;
  vatYN: string | null;
  vatPercent: number | null;
  totalBuyingPrice: string | null;
  cancellation: string | null;

  // === ASSIGNMENT (Col 34) ===
  pic: string | null;

  // === SELLING PRICES (Cols 35-42) ===
  b2bPriceInstant: string | null;
  b2bPriceOnRequest: string | null;
  b2cPriceInstant: string | null;
  b2cPriceOnRequest: string | null;
  extraHrB2BInstant: string | null;
  extraHrB2BRequest: string | null;
  extraHrB2CInstant: string | null;
  extraHrB2CRequest: string | null;

  // === VALIDITY & CANCELLATION POLICY (Cols 43-48) ===
  tourValidityGeneral: string | null;
  tourValiditySpecific: string | null;
  cancelInstant: string | null;
  cutoffInstant: string | null;
  cancelOnRequest: string | null;
  cutoffOnRequest: string | null;

  // === NOTES & OTA MASTER (Cols 49-50) ===
  notesGeneral: string | null;
  otaMasterSheet: string | null;

  // === OTA DISTRIBUTION CHANNELS (Cols 51-63) ===
  otaTravmonde: string | null;
  otaBookableTours: string | null;
  otaViator: string | null;
  otaGyg: string | null;
  otaHotelbeds: string | null;
  otaProjectExpedition: string | null;
  otaAirbnb: string | null;
  otaBokun: string | null;
  otaTrekksoft: string | null;
  otaTuiMusement: string | null;
  otaKlook: string | null;
  otaToristy: string | null;
  otaTourHQ: string | null;

  // === UPLOAD WORKFLOW (Cols 64-69) ===
  qualityRemarks: string | null;
  readyForUpload: boolean;
  uploadedPic: string | null;
  dateOfDispatch: string | null;
  dateUploaded: string | null;
  productLink: string | null;
}

export type ProductStatus =
  | 'In Progress'
  | 'Completed'
  | 'In Progress - High priority'
  | 'On hold'
  | 'Ignored';

export type PIC = 'CM' | 'LG' | 'DS' | 'CC' | 'DV' | 'SB' | 'IS' | 'Hanieh' | 'RB';

export interface FiltersResponse {
  countries: string[];
  cities: string[];
  productTypes: string[];
  statuses: string[];
  pics: string[];
}

export interface StatsResponse {
  total: number;
  readyForUpload: number;
  uploaded: number;
  inProgress: number;
  completed: number;
  highPriority: number;
  onHold: number;
  ignored: number;
}

export interface ApiError {
  error: string;
}
```

---

### `lib/constants.ts`

```typescript
import type { TourProduct } from './types';

// Maps sheet column index (0-based) to TourProduct field name
// 70 columns total (A=0 through BR=69)
export const COLUMN_MAP: Record<number, keyof Omit<TourProduct, 'rowIndex'>> = {
  0: 'country',
  1: 'city',
  2: 'department',
  3: 'region',
  4: 'productType',
  5: 'link',
  6: 'duration',
  7: 'productStatus',
  8: 'productName',
  9: 'written',
  10: 'notes',
  11: 'isOk',
  12: 'ssOk',
  13: 'imageLinks',
  14: 'maxPax',
  15: 'guide',
  16: 'driver',
  17: 'driverGuide',
  18: 'guideWhere',
  19: 'componentsOfTour',
  20: 'attractionIncluded',
  21: 'attractionOptional',
  22: 'transportation',
  23: 'attractionsIncluded',
  24: 'attractionLink',
  25: 'providerPrice',
  26: 'providerUrl',
  27: 'centralProviderLinks',
  28: 'centralTransportLinks',
  29: 'transportationPrice',
  30: 'vatYN',
  31: 'vatPercent',
  32: 'totalBuyingPrice',
  33: 'cancellation',
  34: 'pic',
  35: 'b2bPriceInstant',
  36: 'b2bPriceOnRequest',
  37: 'b2cPriceInstant',
  38: 'b2cPriceOnRequest',
  39: 'extraHrB2BInstant',
  40: 'extraHrB2BRequest',
  41: 'extraHrB2CInstant',
  42: 'extraHrB2CRequest',
  43: 'tourValidityGeneral',
  44: 'tourValiditySpecific',
  45: 'cancelInstant',
  46: 'cutoffInstant',
  47: 'cancelOnRequest',
  48: 'cutoffOnRequest',
  49: 'notesGeneral',
  50: 'otaMasterSheet',
  51: 'otaTravmonde',
  52: 'otaBookableTours',
  53: 'otaViator',
  54: 'otaGyg',
  55: 'otaHotelbeds',
  56: 'otaProjectExpedition',
  57: 'otaAirbnb',
  58: 'otaBokun',
  59: 'otaTrekksoft',
  60: 'otaTuiMusement',
  61: 'otaKlook',
  62: 'otaToristy',
  63: 'otaTourHQ',
  64: 'qualityRemarks',
  65: 'readyForUpload',
  66: 'uploadedPic',
  67: 'dateOfDispatch',
  68: 'dateUploaded',
  69: 'productLink',
};

// Reverse: field name → column index
export const FIELD_TO_COL: Record<keyof Omit<TourProduct, 'rowIndex'>, number> =
  Object.fromEntries(
    Object.entries(COLUMN_MAP).map(([col, field]) => [field, Number(col)])
  ) as Record<keyof Omit<TourProduct, 'rowIndex'>, number>;

// Sheet column headers (as they appear in row 1)
export const COLUMN_HEADERS: Record<number, string> = {
  0: 'Country',
  1: 'City',
  2: 'Department',
  3: 'Region',
  4: 'Product type',
  5: 'Link',
  6: '🕐',
  7: 'Product Status',
  8: 'Product Name',
  9: 'Written',
  10: 'Notes',
  11: 'IS OK',
  12: 'SS OK',
  13: 'Image links',
  14: 'Max Pax',
  15: 'Guide',
  16: 'Driver',
  17: 'Driver-guide',
  18: 'Guide where',
  19: 'Components of tour',
  20: 'Attraction Included?',
  21: 'Attraction optional',
  22: 'Transportation',
  23: 'Attractions Included',
  24: 'Attraction Link',
  25: 'Provider Price',
  26: 'Provider URL',
  27: 'Central Provider Links',
  28: 'Central Transport Links',
  29: 'Transportation Price',
  30: 'VAT (Y/N)',
  31: 'VAT %',
  32: 'Total Buying Price',
  33: 'Cancellation',
  34: 'PIC',
  35: 'B2B Price (Instant)',
  36: 'B2B Price (On request)',
  37: 'B2C Price (Instant)',
  38: 'B2C Price (On request)',
  39: 'Extra Hr Suppl. B2B Instant',
  40: 'Ex. Hr B2B Request',
  41: 'Extra Hr B2C Instant',
  42: 'Extra Hr B2C Request',
  43: 'Tour Validity (General)',
  44: 'Tour Validity (Specific)',
  45: 'Cancel. INSTANT',
  46: 'Cut-off INSTANT',
  47: 'Cancel. On request',
  48: 'Cut-off On request',
  49: 'NOTES',
  50: 'OTA Master Sheet',
  51: 'Travmonde',
  52: 'Bookable Tours',
  53: 'Viator',
  54: 'GYG',
  55: 'Hotelbeds',
  56: 'Project Expedition',
  57: 'Airbnb',
  58: 'Bokun',
  59: 'Trekksoft',
  60: 'TUI/Musement',
  61: 'Klook',
  62: 'Toristy',
  63: 'TourHQ',
  64: 'Quality - Remarks',
  65: 'Ready for Upload',
  66: 'Uploaded (PIC)',
  67: 'Date of Dispatch',
  68: 'Date uploaded',
  69: 'Product link',
};

// Boolean fields (cols that store TRUE/FALSE or 1.0/0.0)
export const BOOLEAN_FIELDS = new Set<keyof TourProduct>([
  'written', 'ssOk', 'guide', 'driver', 'driverGuide',
  'attractionIncluded', 'attractionOptional', 'readyForUpload',
]);

// Fields where the raw cell value is a float/number
export const NUMBER_FIELDS = new Set<keyof TourProduct>(['vatPercent']);

// Product status values
export const PRODUCT_STATUSES = [
  'In Progress',
  'Completed',
  'In Progress - High priority',
  'On hold',
  'Ignored',
] as const;

// PIC values
export const PIC_VALUES = ['CM', 'LG', 'DS', 'CC', 'DV', 'SB', 'IS', 'Hanieh', 'RB'] as const;

// Column group definitions for the table UI
export const COLUMN_GROUPS = [
  {
    id: 'location',
    label: 'Location & Identity',
    fields: ['country', 'city', 'department', 'region', 'productType'] as const,
  },
  {
    id: 'product',
    label: 'Product Info',
    fields: ['link', 'duration', 'productStatus', 'productName', 'written', 'notes'] as const,
  },
  {
    id: 'content',
    label: 'Content Status',
    fields: ['isOk', 'ssOk', 'imageLinks'] as const,
  },
  {
    id: 'tour',
    label: 'Tour Configuration',
    fields: [
      'maxPax', 'guide', 'driver', 'driverGuide', 'guideWhere',
      'componentsOfTour', 'attractionIncluded', 'attractionOptional',
      'transportation', 'attractionsIncluded', 'attractionLink',
    ] as const,
  },
  {
    id: 'provider',
    label: 'Provider & Buying',
    fields: [
      'providerPrice', 'providerUrl', 'centralProviderLinks', 'centralTransportLinks',
      'transportationPrice', 'vatYN', 'vatPercent', 'totalBuyingPrice', 'cancellation',
    ] as const,
  },
  {
    id: 'assignment',
    label: 'Assignment',
    fields: ['pic'] as const,
  },
  {
    id: 'selling',
    label: 'Selling Prices',
    fields: [
      'b2bPriceInstant', 'b2bPriceOnRequest', 'b2cPriceInstant', 'b2cPriceOnRequest',
      'extraHrB2BInstant', 'extraHrB2BRequest', 'extraHrB2CInstant', 'extraHrB2CRequest',
    ] as const,
  },
  {
    id: 'validity',
    label: 'Validity & Cancellation',
    fields: [
      'tourValidityGeneral', 'tourValiditySpecific',
      'cancelInstant', 'cutoffInstant', 'cancelOnRequest', 'cutoffOnRequest',
    ] as const,
  },
  {
    id: 'notes',
    label: 'Notes & OTA Master',
    fields: ['notesGeneral', 'otaMasterSheet'] as const,
  },
  {
    id: 'ota',
    label: 'OTA Distribution',
    fields: [
      'otaTravmonde', 'otaBookableTours', 'otaViator', 'otaGyg', 'otaHotelbeds',
      'otaProjectExpedition', 'otaAirbnb', 'otaBokun', 'otaTrekksoft',
      'otaTuiMusement', 'otaKlook', 'otaToristy', 'otaTourHQ',
    ] as const,
  },
  {
    id: 'upload',
    label: 'Upload Workflow',
    fields: [
      'qualityRemarks', 'readyForUpload', 'uploadedPic',
      'dateOfDispatch', 'dateUploaded', 'productLink',
    ] as const,
  },
] as const;

// View presets (column visibility)
export const VIEW_PRESETS: Record<string, Array<keyof Omit<TourProduct, 'rowIndex'>>> = {
  overview: ['country', 'city', 'productType', 'link', 'duration', 'productStatus', 'pic', 'readyForUpload'],
  pricing: ['country', 'city', 'link', 'providerPrice', 'totalBuyingPrice', 'b2bPriceInstant', 'b2bPriceOnRequest', 'b2cPriceInstant', 'b2cPriceOnRequest', 'extraHrB2BInstant', 'extraHrB2BRequest', 'extraHrB2CInstant', 'extraHrB2CRequest'],
  ota: ['country', 'city', 'link', 'otaTravmonde', 'otaBookableTours', 'otaViator', 'otaGyg', 'otaHotelbeds', 'otaProjectExpedition', 'otaAirbnb', 'otaBokun', 'otaTrekksoft', 'otaTuiMusement', 'otaKlook', 'otaToristy', 'otaTourHQ'],
  upload: ['country', 'city', 'link', 'isOk', 'ssOk', 'qualityRemarks', 'readyForUpload', 'uploadedPic', 'dateOfDispatch', 'dateUploaded', 'productLink'],
  tourDetails: ['country', 'city', 'link', 'maxPax', 'guide', 'driver', 'driverGuide', 'componentsOfTour', 'attractionIncluded', 'attractionOptional', 'transportation', 'attractionsIncluded', 'attractionLink'],
};

// Status badge colours (Tailwind classes)
export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'In Progress': { bg: 'bg-amber-100', text: 'text-amber-800' },
  'Completed': { bg: 'bg-green-100', text: 'text-green-800' },
  'In Progress - High priority': { bg: 'bg-red-100', text: 'text-red-800' },
  'On hold': { bg: 'bg-gray-100', text: 'text-gray-600' },
  'Ignored': { bg: 'bg-gray-50', text: 'text-gray-400' },
};

// Human-readable display names for each field
export const FIELD_LABELS: Record<keyof Omit<TourProduct, 'rowIndex'>, string> = {
  country: 'Country',
  city: 'City',
  department: 'Department',
  region: 'Region',
  productType: 'Product Type',
  link: 'Link / Title',
  duration: 'Duration',
  productStatus: 'Status',
  productName: 'Product Name',
  written: 'Written',
  notes: 'Notes',
  isOk: 'IS OK',
  ssOk: 'SS OK',
  imageLinks: 'Image Links',
  maxPax: 'Max Pax',
  guide: 'Guide',
  driver: 'Driver',
  driverGuide: 'Driver-Guide',
  guideWhere: 'Guide Where',
  componentsOfTour: 'Components',
  attractionIncluded: 'Attraction Included?',
  attractionOptional: 'Attraction Optional',
  transportation: 'Transportation',
  attractionsIncluded: 'Attractions Included',
  attractionLink: 'Attraction Link',
  providerPrice: 'Provider Price',
  providerUrl: 'Provider URL',
  centralProviderLinks: 'Central Provider Links',
  centralTransportLinks: 'Central Transport Links',
  transportationPrice: 'Transport Price',
  vatYN: 'VAT (Y/N)',
  vatPercent: 'VAT %',
  totalBuyingPrice: 'Total Buying Price',
  cancellation: 'Cancellation',
  pic: 'PIC',
  b2bPriceInstant: 'B2B Instant',
  b2bPriceOnRequest: 'B2B On Request',
  b2cPriceInstant: 'B2C Instant',
  b2cPriceOnRequest: 'B2C On Request',
  extraHrB2BInstant: 'Extra Hr B2B Instant',
  extraHrB2BRequest: 'Extra Hr B2B Request',
  extraHrB2CInstant: 'Extra Hr B2C Instant',
  extraHrB2CRequest: 'Extra Hr B2C Request',
  tourValidityGeneral: 'Validity (General)',
  tourValiditySpecific: 'Validity (Specific)',
  cancelInstant: 'Cancel Instant',
  cutoffInstant: 'Cutoff Instant',
  cancelOnRequest: 'Cancel On Request',
  cutoffOnRequest: 'Cutoff On Request',
  notesGeneral: 'Notes (General)',
  otaMasterSheet: 'OTA Master Sheet',
  otaTravmonde: 'Travmonde',
  otaBookableTours: 'Bookable Tours',
  otaViator: 'Viator',
  otaGyg: 'GYG',
  otaHotelbeds: 'Hotelbeds',
  otaProjectExpedition: 'Project Expedition',
  otaAirbnb: 'Airbnb',
  otaBokun: 'Bokun',
  otaTrekksoft: 'Trekksoft',
  otaTuiMusement: 'TUI/Musement',
  otaKlook: 'Klook',
  otaToristy: 'Toristy',
  otaTourHQ: 'TourHQ',
  qualityRemarks: 'Quality Remarks',
  readyForUpload: 'Ready for Upload',
  uploadedPic: 'Uploaded (PIC)',
  dateOfDispatch: 'Date of Dispatch',
  dateUploaded: 'Date Uploaded',
  productLink: 'Product Link',
};
```

---

### `lib/utils.ts` — extend (add after the existing `cn` function)

Add these data-normalisation helpers:

```typescript
// Coerce a raw cell string to boolean
// Handles: "1", "1.0", "TRUE", "True", "true" → true
// Handles: "0", "0.0", "FALSE", "False", "false", "", undefined → false
export function toBoolean(raw: string | undefined): boolean {
  if (!raw) return false;
  const s = raw.trim().toLowerCase();
  return s === '1' || s === '1.0' || s === 'true';
}

// Coerce a raw cell string to number | null
export function toNumber(raw: string | undefined): number | null {
  if (!raw || raw.trim() === '') return null;
  const n = Number(raw.trim());
  return isNaN(n) ? null : n;
}

// Normalise a text cell: trim whitespace, remove non-breaking spaces, return null if empty
export function toText(raw: string | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\u00a0/g, ' ').trim();
  return cleaned === '' ? null : cleaned;
}

// Required text (Country, City, ProductType) — returns empty string if missing
export function toRequiredText(raw: string | undefined): string {
  return toText(raw) ?? '';
}
```

---

### Row ↔ TourProduct conversion helpers — add to `lib/utils.ts`

```typescript
import { COLUMN_MAP, BOOLEAN_FIELDS, NUMBER_FIELDS } from './constants';
import type { TourProduct } from './types';

// Convert a raw sheet row (string[]) to a TourProduct
// rowIndex is the 1-based sheet row number
export function rowToProduct(row: string[], rowIndex: number): TourProduct {
  const get = (col: number) => row[col];

  return {
    rowIndex,
    country: toRequiredText(get(0)),
    city: toRequiredText(get(1)),
    department: toText(get(2)),
    region: toText(get(3)),
    productType: toRequiredText(get(4)),
    link: toText(get(5)),
    duration: toText(get(6)),
    productStatus: toText(get(7)),
    productName: toText(get(8)),
    written: toBoolean(get(9)),
    notes: toText(get(10)),
    isOk: toText(get(11)),
    ssOk: toBoolean(get(12)),
    imageLinks: toText(get(13)),
    maxPax: toText(get(14)),
    guide: toBoolean(get(15)),
    driver: toBoolean(get(16)),
    driverGuide: toBoolean(get(17)),
    guideWhere: toText(get(18)),
    componentsOfTour: toText(get(19)),
    attractionIncluded: toBoolean(get(20)),
    attractionOptional: toBoolean(get(21)),
    transportation: toText(get(22)),
    attractionsIncluded: toText(get(23)),
    attractionLink: toText(get(24)),
    providerPrice: toText(get(25)),
    providerUrl: toText(get(26)),
    centralProviderLinks: toText(get(27)),
    centralTransportLinks: toText(get(28)),
    transportationPrice: toText(get(29)),
    vatYN: toText(get(30)),
    vatPercent: toNumber(get(31)),
    totalBuyingPrice: toText(get(32)),
    cancellation: toText(get(33)),
    pic: toText(get(34)),
    b2bPriceInstant: toText(get(35)),
    b2bPriceOnRequest: toText(get(36)),
    b2cPriceInstant: toText(get(37)),
    b2cPriceOnRequest: toText(get(38)),
    extraHrB2BInstant: toText(get(39)),
    extraHrB2BRequest: toText(get(40)),
    extraHrB2CInstant: toText(get(41)),
    extraHrB2CRequest: toText(get(42)),
    tourValidityGeneral: toText(get(43)),
    tourValiditySpecific: toText(get(44)),
    cancelInstant: toText(get(45)),
    cutoffInstant: toText(get(46)),
    cancelOnRequest: toText(get(47)),
    cutoffOnRequest: toText(get(48)),
    notesGeneral: toText(get(49)),
    otaMasterSheet: toText(get(50)),
    otaTravmonde: toText(get(51)),
    otaBookableTours: toText(get(52)),
    otaViator: toText(get(53)),
    otaGyg: toText(get(54)),
    otaHotelbeds: toText(get(55)),
    otaProjectExpedition: toText(get(56)),
    otaAirbnb: toText(get(57)),
    otaBokun: toText(get(58)),
    otaTrekksoft: toText(get(59)),
    otaTuiMusement: toText(get(60)),
    otaKlook: toText(get(61)),
    otaToristy: toText(get(62)),
    otaTourHQ: toText(get(63)),
    qualityRemarks: toText(get(64)),
    readyForUpload: toBoolean(get(65)),
    uploadedPic: toText(get(66)),
    dateOfDispatch: toText(get(67)),
    dateUploaded: toText(get(68)),
    productLink: toText(get(69)),
  };
}

// Convert a TourProduct back to a flat string[] of 70 values for writing to Sheets
export function productToRow(product: Omit<TourProduct, 'rowIndex'>): string[] {
  const row = new Array(70).fill('');
  const set = (col: number, val: string | number | boolean | null | undefined) => {
    if (val === null || val === undefined) { row[col] = ''; return; }
    if (typeof val === 'boolean') { row[col] = val ? 'TRUE' : 'FALSE'; return; }
    row[col] = String(val);
  };
  set(0, product.country);
  set(1, product.city);
  set(2, product.department);
  set(3, product.region);
  set(4, product.productType);
  set(5, product.link);
  set(6, product.duration);
  set(7, product.productStatus);
  set(8, product.productName);
  set(9, product.written);
  set(10, product.notes);
  set(11, product.isOk);
  set(12, product.ssOk);
  set(13, product.imageLinks);
  set(14, product.maxPax);
  set(15, product.guide);
  set(16, product.driver);
  set(17, product.driverGuide);
  set(18, product.guideWhere);
  set(19, product.componentsOfTour);
  set(20, product.attractionIncluded);
  set(21, product.attractionOptional);
  set(22, product.transportation);
  set(23, product.attractionsIncluded);
  set(24, product.attractionLink);
  set(25, product.providerPrice);
  set(26, product.providerUrl);
  set(27, product.centralProviderLinks);
  set(28, product.centralTransportLinks);
  set(29, product.transportationPrice);
  set(30, product.vatYN);
  set(31, product.vatPercent);
  set(32, product.totalBuyingPrice);
  set(33, product.cancellation);
  set(34, product.pic);
  set(35, product.b2bPriceInstant);
  set(36, product.b2bPriceOnRequest);
  set(37, product.b2cPriceInstant);
  set(38, product.b2cPriceOnRequest);
  set(39, product.extraHrB2BInstant);
  set(40, product.extraHrB2BRequest);
  set(41, product.extraHrB2CInstant);
  set(42, product.extraHrB2CRequest);
  set(43, product.tourValidityGeneral);
  set(44, product.tourValiditySpecific);
  set(45, product.cancelInstant);
  set(46, product.cutoffInstant);
  set(47, product.cancelOnRequest);
  set(48, product.cutoffOnRequest);
  set(49, product.notesGeneral);
  set(50, product.otaMasterSheet);
  set(51, product.otaTravmonde);
  set(52, product.otaBookableTours);
  set(53, product.otaViator);
  set(54, product.otaGyg);
  set(55, product.otaHotelbeds);
  set(56, product.otaProjectExpedition);
  set(57, product.otaAirbnb);
  set(58, product.otaBokun);
  set(59, product.otaTrekksoft);
  set(60, product.otaTuiMusement);
  set(61, product.otaKlook);
  set(62, product.otaToristy);
  set(63, product.otaTourHQ);
  set(64, product.qualityRemarks);
  set(65, product.readyForUpload);
  set(66, product.uploadedPic);
  set(67, product.dateOfDispatch);
  set(68, product.dateUploaded);
  set(69, product.productLink);
  return row;
}
```

**Commit message:** `feat: type definitions, column mapping, and data normalisation utilities`

---

## Task 4 — API Routes: GET /api/products and GET /api/filters

### Files to create
- `app/api/products/route.ts`
- `app/api/filters/route.ts`
- `app/api/stats/route.ts`
- `app/api/inventory-update/route.ts`

---

### `app/api/products/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { fetchAllRows } from '@/lib/sheets';
import { rowToProduct } from '@/lib/utils';
import type { TourProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await fetchAllRows();
    // Row 0 is the header — skip it. Data starts at row index 1 (array[1]).
    // Sheet rowIndex is 1-based: array[1] = sheet row 2 (first data row)
    const products: TourProduct[] = rows
      .slice(1) // skip header
      .map((row, i) => rowToProduct(row, i + 2)); // i=0 → sheet row 2
    return NextResponse.json(products);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

### `app/api/filters/route.ts`

Returns distinct values for filter dropdowns, trimmed and deduplicated.

```typescript
import { NextResponse } from 'next/server';
import { fetchAllRows } from '@/lib/sheets';
import { toText } from '@/lib/utils';
import type { FiltersResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await fetchAllRows();
    const data = rows.slice(1); // skip header

    const unique = (col: number): string[] => {
      const set = new Set<string>();
      for (const row of data) {
        const val = toText(row[col]);
        if (val) set.add(val);
      }
      return Array.from(set).sort();
    };

    const filters: FiltersResponse = {
      countries: unique(0),   // country
      cities: unique(1),      // city
      productTypes: unique(4), // productType
      statuses: unique(7),    // productStatus
      pics: unique(34),       // pic
    };

    return NextResponse.json(filters);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

### `app/api/stats/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { fetchAllRows } from '@/lib/sheets';
import { toBoolean, toText } from '@/lib/utils';
import type { StatsResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await fetchAllRows();
    const data = rows.slice(1);

    let readyForUpload = 0, uploaded = 0, inProgress = 0,
        completed = 0, highPriority = 0, onHold = 0, ignored = 0;

    for (const row of data) {
      if (toBoolean(row[65])) readyForUpload++;
      const pic = toText(row[66]);
      if (pic && pic !== 'No') uploaded++;
      const status = toText(row[7]);
      if (status === 'In Progress') inProgress++;
      else if (status === 'Completed') completed++;
      else if (status === 'In Progress - High priority') highPriority++;
      else if (status === 'On hold') onHold++;
      else if (status === 'Ignored') ignored++;
    }

    const stats: StatsResponse = {
      total: data.length,
      readyForUpload,
      uploaded,
      inProgress,
      completed,
      highPriority,
      onHold,
      ignored,
    };

    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

### `app/api/inventory-update/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { fetchInventoryUpdate } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await fetchInventoryUpdate();
    return NextResponse.json({ rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Commit message:** `feat: API routes for products, filters, stats, and inventory-update`

---

## Task 5 — Basic Products Table Page (read-only)

### Files to create / modify
- `app/products/page.tsx`
- `components/products/product-table.tsx`
- `app/layout.tsx` (update to include sidebar)
- `components/sidebar.tsx`

### Overview

This is a read-only products table using TanStack Table v8 with all 70 columns. Fetches data from `/api/products` using SWR. No editing yet — that comes in Phase 2b.

Keep it simple but functional:
- All 70 columns visible in groups
- Sticky Country + City columns
- Sticky header row
- Basic column sorting (click header)
- Loading skeleton
- Error state

### `components/sidebar.tsx`

Simple sidebar with navigation links. Use `bg-sidebar` (the Tailwind token we added), dark background.

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, FileText, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/inventory-update', label: 'Inventory Update', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-56 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex h-14 items-center px-4 border-b border-sidebar-border">
        <span className="font-semibold text-sidebar-primary">Sheet Admin</span>
      </div>
      <nav className="flex-1 py-4 space-y-1 px-2">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

### Update `app/layout.tsx`

Wrap children in a flex layout with the sidebar:

```tsx
import { Sidebar } from '@/components/sidebar';

// In the body:
<body ...>
  <div className="flex h-screen overflow-hidden">
    <Sidebar />
    <main className="flex-1 overflow-auto bg-background">
      {children}
    </main>
  </div>
  <Toaster ... />
</body>
```

### `app/products/page.tsx`

```tsx
import { ProductTable } from '@/components/products/product-table';

export default function ProductsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h1 className="text-xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">Manage tour product data</p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <ProductTable />
      </div>
    </div>
  );
}
```

### `components/products/product-table.tsx`

This is the core component. Use TanStack Table v8 with useSWR.

Key requirements:
- `'use client'` directive
- Fetch from `/api/products` with SWR (dedupe interval 60s)
- All 70 data columns + 1 row-number column
- Column groups rendered as a grouped header (2-row thead): group row + column row
- Sticky first 2 data columns (Country, City): `sticky left-0` and `sticky left-[col-width]`
- Sticky header: `sticky top-0 z-10`
- Use `useReactTable` from `@tanstack/react-table` with `getCoreRowModel`, `getSortedRowModel`
- Column sorting: click header toggles asc/desc
- Loading state: show skeleton rows (10 rows × first 10 columns)
- Error state: show error message card
- Column widths: set reasonable defaults — Country/City 120px, ProductType 130px, Link 200px, boolean cols 60px, etc.
- For long text cells (Notes, etc.), truncate with `max-w-[200px] truncate` and title attribute
- Boolean cells: show green dot ● for true, gray dot ● for false
- Status cells: show colored badge using STATUS_COLORS from constants

Do not implement virtual scrolling yet — that comes in Phase 2. The table should just overflow with a scrollbar for now.

**Commit message:** `feat: basic products table with TanStack Table, sidebar layout`

---

## Verification

After all 3 tasks:
1. `npx tsc --noEmit` — must pass with zero errors
2. `npm run build` — must succeed
3. `npm run dev` — open `http://localhost:3000/products` — table should render (even if data fetch fails due to missing env vars, the page should load without crashing)

Commit each task separately with the messages above.
