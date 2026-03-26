import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { TourProduct } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
