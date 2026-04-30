import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { TourProduct } from './types';
import { FIELD_TO_COL } from './constants';

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

// Reject anything that isn't an http(s) URL — blocks javascript:, data:, vbscript:, etc.
export function isSafeHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// Parse a link field value that may be stored as "Display Text||https://url"
// or as a bare URL, or as plain text with no URL.
// Any URL that is not http(s) is dropped to prevent stored XSS via javascript: URIs.
export function parseLinkField(value: string): { text: string; url: string } {
  const idx = value.indexOf('||');
  if (idx !== -1) {
    const text = value.substring(0, idx);
    const url = value.substring(idx + 2);
    return { text, url: isSafeHttpUrl(url) ? url : '' };
  }
  if (isSafeHttpUrl(value)) {
    return { text: '', url: value };
  }
  return { text: value, url: '' };
}

// Convert a raw sheet row (string[]) to a TourProduct
// rowIndex is the 1-based sheet row number
export function rowToProduct(
  row: string[],
  rowIndex: number,
  linkHyperlink?: string,
  imageLinksRichText?: string,
  colMap: Record<string, number> = FIELD_TO_COL,
): TourProduct {
  const get = (field: string) => row[colMap[field as keyof typeof colMap]];
  const linkText = toText(get('link'));

  // If the cell has an underlying hyperlink, combine as "display text||url"
  let link: string | null;
  if (linkHyperlink) {
    link = linkText && linkText !== linkHyperlink
      ? `${linkText}||${linkHyperlink}`
      : linkHyperlink;
  } else {
    link = linkText;
  }

  return {
    rowIndex,
    country: toRequiredText(get('country')),
    city: toRequiredText(get('city')),
    department: toText(get('department')),
    region: toText(get('region')),
    productType: toRequiredText(get('productType')),
    link,
    duration: toText(get('duration')),
    productStatus: toText(get('productStatus')),
    productName: toText(get('productName')),
    written: toBoolean(get('written')),
    notes: toText(get('notes')),
    isOk: toText(get('isOk')),
    ssOk: toBoolean(get('ssOk')),
    imageLinks: imageLinksRichText ?? toText(get('imageLinks')),
    maxPax: toText(get('maxPax')),
    guide: toBoolean(get('guide')),
    driver: toBoolean(get('driver')),
    driverGuide: toBoolean(get('driverGuide')),
    guideWhere: toText(get('guideWhere')),
    componentsOfTour: toText(get('componentsOfTour')),
    attractionIncluded: toBoolean(get('attractionIncluded')),
    attractionOptional: toBoolean(get('attractionOptional')),
    transportation: toText(get('transportation')),
    attractionsIncluded: toText(get('attractionsIncluded')),
    attractionLink: toText(get('attractionLink')),
    providerPrice: toText(get('providerPrice')),
    providerUrl: toText(get('providerUrl')),
    centralProviderLinks: toText(get('centralProviderLinks')),
    centralTransportLinks: toText(get('centralTransportLinks')),
    transportationPrice: toText(get('transportationPrice')),
    vatYN: toText(get('vatYN')),
    vatPercent: toNumber(get('vatPercent')),
    totalBuyingPrice: toText(get('totalBuyingPrice')),
    cancellation: toText(get('cancellation')),
    pic: toText(get('pic')),
    b2bPriceInstant: toText(get('b2bPriceInstant')),
    b2bPriceOnRequest: toText(get('b2bPriceOnRequest')),
    b2cPriceInstant: toText(get('b2cPriceInstant')),
    b2cPriceOnRequest: toText(get('b2cPriceOnRequest')),
    extraHrB2BInstant: toText(get('extraHrB2BInstant')),
    extraHrB2BRequest: toText(get('extraHrB2BRequest')),
    extraHrB2CInstant: toText(get('extraHrB2CInstant')),
    extraHrB2CRequest: toText(get('extraHrB2CRequest')),
    tourValidityGeneral: toText(get('tourValidityGeneral')),
    tourValiditySpecific: toText(get('tourValiditySpecific')),
    cancelInstant: toText(get('cancelInstant')),
    cutoffInstant: toText(get('cutoffInstant')),
    cancelOnRequest: toText(get('cancelOnRequest')),
    cutoffOnRequest: toText(get('cutoffOnRequest')),
    notesGeneral: toText(get('notesGeneral')),
    otaMasterSheet: toText(get('otaMasterSheet')),
    otaTravmonde: toText(get('otaTravmonde')),
    otaBookableTours: toText(get('otaBookableTours')),
    otaViator: toText(get('otaViator')),
    otaGyg: toText(get('otaGyg')),
    otaHotelbeds: toText(get('otaHotelbeds')),
    otaProjectExpedition: toText(get('otaProjectExpedition')),
    otaAirbnb: toText(get('otaAirbnb')),
    otaBokun: toText(get('otaBokun')),
    otaTrekksoft: toText(get('otaTrekksoft')),
    otaTuiMusement: toText(get('otaTuiMusement')),
    otaKlook: toText(get('otaKlook')),
    otaToristy: toText(get('otaToristy')),
    otaTourHQ: toText(get('otaTourHQ')),
    qualityRemarks: toText(get('qualityRemarks')),
    readyForUpload: toBoolean(get('readyForUpload')),
    uploadedPic: toText(get('uploadedPic')),
    dateOfDispatch: toText(get('dateOfDispatch')),
    dateUploaded: toText(get('dateUploaded')),
    productLink: toText(get('productLink')),
  };
}

// Convert a TourProduct back to a flat string[] of 70 values for writing to Sheets
export function productToRow(
  product: Omit<TourProduct, 'rowIndex'>,
  colMap: Record<string, number> = FIELD_TO_COL,
): string[] {
  const row = new Array(70).fill('');
  const set = (field: string, val: string | number | boolean | null | undefined) => {
    const col = colMap[field as keyof typeof colMap];
    if (col === undefined) return;
    if (val === null || val === undefined) { row[col] = ''; return; }
    if (typeof val === 'boolean') { row[col] = val ? 'TRUE' : 'FALSE'; return; }
    row[col] = String(val);
  };
  set('country', product.country);
  set('city', product.city);
  set('department', product.department);
  set('region', product.region);
  set('productType', product.productType);
  // link field: only write display text to the cell value; hyperlink is set separately
  set('link', product.link ? parseLinkField(product.link).text || parseLinkField(product.link).url : '');
  set('duration', product.duration);
  set('productStatus', product.productStatus);
  set('productName', product.productName);
  set('written', product.written);
  set('notes', product.notes);
  set('isOk', product.isOk);
  set('ssOk', product.ssOk);
  set('imageLinks', product.imageLinks);
  set('maxPax', product.maxPax);
  set('guide', product.guide);
  set('driver', product.driver);
  set('driverGuide', product.driverGuide);
  set('guideWhere', product.guideWhere);
  set('componentsOfTour', product.componentsOfTour);
  set('attractionIncluded', product.attractionIncluded);
  set('attractionOptional', product.attractionOptional);
  set('transportation', product.transportation);
  set('attractionsIncluded', product.attractionsIncluded);
  set('attractionLink', product.attractionLink);
  set('providerPrice', product.providerPrice);
  set('providerUrl', product.providerUrl);
  set('centralProviderLinks', product.centralProviderLinks);
  set('centralTransportLinks', product.centralTransportLinks);
  set('transportationPrice', product.transportationPrice);
  set('vatYN', product.vatYN);
  set('vatPercent', product.vatPercent);
  set('totalBuyingPrice', product.totalBuyingPrice);
  set('cancellation', product.cancellation);
  set('pic', product.pic);
  set('b2bPriceInstant', product.b2bPriceInstant);
  set('b2bPriceOnRequest', product.b2bPriceOnRequest);
  set('b2cPriceInstant', product.b2cPriceInstant);
  set('b2cPriceOnRequest', product.b2cPriceOnRequest);
  set('extraHrB2BInstant', product.extraHrB2BInstant);
  set('extraHrB2BRequest', product.extraHrB2BRequest);
  set('extraHrB2CInstant', product.extraHrB2CInstant);
  set('extraHrB2CRequest', product.extraHrB2CRequest);
  set('tourValidityGeneral', product.tourValidityGeneral);
  set('tourValiditySpecific', product.tourValiditySpecific);
  set('cancelInstant', product.cancelInstant);
  set('cutoffInstant', product.cutoffInstant);
  set('cancelOnRequest', product.cancelOnRequest);
  set('cutoffOnRequest', product.cutoffOnRequest);
  set('notesGeneral', product.notesGeneral);
  set('otaMasterSheet', product.otaMasterSheet);
  set('otaTravmonde', product.otaTravmonde);
  set('otaBookableTours', product.otaBookableTours);
  set('otaViator', product.otaViator);
  set('otaGyg', product.otaGyg);
  set('otaHotelbeds', product.otaHotelbeds);
  set('otaProjectExpedition', product.otaProjectExpedition);
  set('otaAirbnb', product.otaAirbnb);
  set('otaBokun', product.otaBokun);
  set('otaTrekksoft', product.otaTrekksoft);
  set('otaTuiMusement', product.otaTuiMusement);
  set('otaKlook', product.otaKlook);
  set('otaToristy', product.otaToristy);
  set('otaTourHQ', product.otaTourHQ);
  set('qualityRemarks', product.qualityRemarks);
  set('readyForUpload', product.readyForUpload);
  set('uploadedPic', product.uploadedPic);
  set('dateOfDispatch', product.dateOfDispatch);
  set('dateUploaded', product.dateUploaded);
  set('productLink', product.productLink);
  return row;
}
