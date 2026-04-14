import type { FiltersResponse, TourProduct } from './types';

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

export type OptionFilterKey = {
  [K in keyof Filters]: Filters[K] extends string[] ? K : never
}[keyof Filters];

export type TriStateFilterKey = {
  [K in keyof Filters]: Filters[K] extends TriState ? K : never
}[keyof Filters];

export type PresenceFilterKey = {
  [K in keyof Filters]: Filters[K] extends PresenceState ? K : never
}[keyof Filters];

export type FilterOptionKey = keyof FiltersResponse;

export const FILTER_SECTIONS = [
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
] as const;

export type FilterSection = (typeof FILTER_SECTIONS)[number];

export const DEFAULT_OPEN_FILTER_SECTIONS: FilterSection[] = [
  'Location',
  'Product',
  'Content',
  'Upload',
];

export const MULTI_SELECT_FILTERS: Array<{
  key: OptionFilterKey;
  responseKey: FilterOptionKey;
  productKey: keyof TourProduct;
  queryKey: string;
  label: string;
  buttonLabel: string;
  section: FilterSection;
  searchable?: boolean;
}> = [
  { key: 'country', responseKey: 'countries', productKey: 'country', queryKey: 'country', label: 'Country', buttonLabel: 'Select countries', section: 'Location', searchable: true },
  { key: 'city', responseKey: 'cities', productKey: 'city', queryKey: 'city', label: 'City', buttonLabel: 'Select cities', section: 'Location', searchable: true },
  { key: 'departments', responseKey: 'departments', productKey: 'department', queryKey: 'department', label: 'Department', buttonLabel: 'Select departments', section: 'Location', searchable: true },
  { key: 'regions', responseKey: 'regions', productKey: 'region', queryKey: 'region', label: 'Region', buttonLabel: 'Select regions', section: 'Location', searchable: true },
  { key: 'productTypes', responseKey: 'productTypes', productKey: 'productType', queryKey: 'type', label: 'Product Type', buttonLabel: 'Select types', section: 'Product', searchable: true },
  { key: 'durations', responseKey: 'durations', productKey: 'duration', queryKey: 'duration', label: 'Duration', buttonLabel: 'Select durations', section: 'Product', searchable: true },
  { key: 'statuses', responseKey: 'statuses', productKey: 'productStatus', queryKey: 'status', label: 'Status', buttonLabel: 'Select statuses', section: 'Product' },
  { key: 'pics', responseKey: 'pics', productKey: 'pic', queryKey: 'pic', label: 'PIC', buttonLabel: 'Select PICs', section: 'Product' },
  { key: 'isOkValues', responseKey: 'isOkValues', productKey: 'isOk', queryKey: 'isOkValue', label: 'IS OK Value', buttonLabel: 'Select values', section: 'Content', searchable: true },
  { key: 'maxPaxValues', responseKey: 'maxPaxValues', productKey: 'maxPax', queryKey: 'maxPax', label: 'Max Pax', buttonLabel: 'Select pax', section: 'Tour Setup' },
  { key: 'guideWhereValues', responseKey: 'guideWhereValues', productKey: 'guideWhere', queryKey: 'guideWhere', label: 'Guide Where', buttonLabel: 'Select values', section: 'Tour Setup', searchable: true },
  { key: 'transportationValues', responseKey: 'transportationValues', productKey: 'transportation', queryKey: 'transportation', label: 'Transportation', buttonLabel: 'Select transport', section: 'Tour Setup', searchable: true },
  { key: 'vatValues', responseKey: 'vatValues', productKey: 'vatYN', queryKey: 'vat', label: 'VAT', buttonLabel: 'Select VAT values', section: 'Buying' },
  { key: 'vatPercentValues', responseKey: 'vatPercentValues', productKey: 'vatPercent', queryKey: 'vatPercent', label: 'VAT %', buttonLabel: 'Select VAT %', section: 'Buying' },
  { key: 'cancellationValues', responseKey: 'cancellationValues', productKey: 'cancellation', queryKey: 'cancellation', label: 'Cancellation', buttonLabel: 'Select values', section: 'Buying', searchable: true },
  { key: 'otaMasterSheetValues', responseKey: 'otaMasterSheetValues', productKey: 'otaMasterSheet', queryKey: 'otaMasterSheetValue', label: 'OTA Master Sheet Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaTravmondeValues', responseKey: 'otaTravmondeValues', productKey: 'otaTravmonde', queryKey: 'otaTravmondeValue', label: 'Travmonde Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaBookableToursValues', responseKey: 'otaBookableToursValues', productKey: 'otaBookableTours', queryKey: 'otaBookableToursValue', label: 'Bookable Tours Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaViatorValues', responseKey: 'otaViatorValues', productKey: 'otaViator', queryKey: 'otaViatorValue', label: 'Viator Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaGygValues', responseKey: 'otaGygValues', productKey: 'otaGyg', queryKey: 'otaGygValue', label: 'GYG Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaHotelbedsValues', responseKey: 'otaHotelbedsValues', productKey: 'otaHotelbeds', queryKey: 'otaHotelbedsValue', label: 'Hotelbeds Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaProjectExpeditionValues', responseKey: 'otaProjectExpeditionValues', productKey: 'otaProjectExpedition', queryKey: 'otaProjectExpeditionValue', label: 'Project Expedition Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaAirbnbValues', responseKey: 'otaAirbnbValues', productKey: 'otaAirbnb', queryKey: 'otaAirbnbValue', label: 'Airbnb Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaBokunValues', responseKey: 'otaBokunValues', productKey: 'otaBokun', queryKey: 'otaBokunValue', label: 'Bokun Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaTrekksoftValues', responseKey: 'otaTrekksoftValues', productKey: 'otaTrekksoft', queryKey: 'otaTrekksoftValue', label: 'Trekksoft Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaTuiMusementValues', responseKey: 'otaTuiMusementValues', productKey: 'otaTuiMusement', queryKey: 'otaTuiMusementValue', label: 'TUI/Musement Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaKlookValues', responseKey: 'otaKlookValues', productKey: 'otaKlook', queryKey: 'otaKlookValue', label: 'Klook Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaToristyValues', responseKey: 'otaToristyValues', productKey: 'otaToristy', queryKey: 'otaToristyValue', label: 'Toristy Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'otaTourHQValues', responseKey: 'otaTourHQValues', productKey: 'otaTourHQ', queryKey: 'otaTourHQValue', label: 'TourHQ Value', buttonLabel: 'Select values', section: 'OTA', searchable: true },
  { key: 'uploadedPics', responseKey: 'uploadedPics', productKey: 'uploadedPic', queryKey: 'uploadedPic', label: 'Uploaded PIC', buttonLabel: 'Select uploaded PICs', section: 'Upload' },
];

export const TRI_STATE_FILTERS: Array<{
  key: TriStateFilterKey;
  productKey: keyof TourProduct;
  queryKey: string;
  label: string;
  chipLabel: string;
  section: FilterSection;
}> = [
  { key: 'written', productKey: 'written', queryKey: 'written', label: 'Written', chipLabel: 'Written', section: 'Content' },
  { key: 'ssOk', productKey: 'ssOk', queryKey: 'ssOk', label: 'SS OK', chipLabel: 'SS OK', section: 'Content' },
  { key: 'guide', productKey: 'guide', queryKey: 'guide', label: 'Guide', chipLabel: 'Guide', section: 'Tour Setup' },
  { key: 'driver', productKey: 'driver', queryKey: 'driver', label: 'Driver', chipLabel: 'Driver', section: 'Tour Setup' },
  { key: 'driverGuide', productKey: 'driverGuide', queryKey: 'driverGuide', label: 'Driver-Guide', chipLabel: 'Driver-Guide', section: 'Tour Setup' },
  { key: 'attractionIncluded', productKey: 'attractionIncluded', queryKey: 'attractionIncluded', label: 'Attraction Included', chipLabel: 'Attraction Included', section: 'Tour Setup' },
  { key: 'attractionOptional', productKey: 'attractionOptional', queryKey: 'attractionOptional', label: 'Attraction Optional', chipLabel: 'Attraction Optional', section: 'Tour Setup' },
  { key: 'readyForUpload', productKey: 'readyForUpload', queryKey: 'ready', label: 'Ready for Upload', chipLabel: 'Ready', section: 'Upload' },
];

export const PRESENCE_FILTERS: Array<{
  key: PresenceFilterKey;
  productKey: keyof TourProduct;
  queryKey: string;
  label: string;
  chipLabel: string;
  section: FilterSection;
}> = [
  { key: 'linkPresence', productKey: 'link', queryKey: 'link', label: 'Link / Title', chipLabel: 'Link', section: 'Product' },
  { key: 'productNamePresence', productKey: 'productName', queryKey: 'productName', label: 'Product Name', chipLabel: 'Product Name', section: 'Product' },
  { key: 'notesPresence', productKey: 'notes', queryKey: 'notes', label: 'Notes', chipLabel: 'Notes', section: 'Content' },
  { key: 'isOkPresence', productKey: 'isOk', queryKey: 'isOk', label: 'IS OK Filled', chipLabel: 'IS OK', section: 'Content' },
  { key: 'imageLinksPresence', productKey: 'imageLinks', queryKey: 'imageLinks', label: 'Image Links', chipLabel: 'Image Links', section: 'Content' },
  { key: 'componentsOfTourPresence', productKey: 'componentsOfTour', queryKey: 'componentsOfTour', label: 'Components of Tour', chipLabel: 'Components', section: 'Tour Setup' },
  { key: 'attractionsIncludedPresence', productKey: 'attractionsIncluded', queryKey: 'attractionsIncluded', label: 'Attractions Included', chipLabel: 'Attractions', section: 'Tour Setup' },
  { key: 'attractionLinkPresence', productKey: 'attractionLink', queryKey: 'attractionLink', label: 'Attraction Link', chipLabel: 'Attraction Link', section: 'Tour Setup' },
  { key: 'providerPricePresence', productKey: 'providerPrice', queryKey: 'providerPrice', label: 'Provider Price', chipLabel: 'Provider Price', section: 'Buying' },
  { key: 'providerUrlPresence', productKey: 'providerUrl', queryKey: 'providerUrl', label: 'Provider URL', chipLabel: 'Provider URL', section: 'Buying' },
  { key: 'centralProviderLinksPresence', productKey: 'centralProviderLinks', queryKey: 'centralProviderLinks', label: 'Central Provider Links', chipLabel: 'Central Provider Links', section: 'Buying' },
  { key: 'centralTransportLinksPresence', productKey: 'centralTransportLinks', queryKey: 'centralTransportLinks', label: 'Central Transport Links', chipLabel: 'Central Transport Links', section: 'Buying' },
  { key: 'transportationPricePresence', productKey: 'transportationPrice', queryKey: 'transportationPrice', label: 'Transportation Price', chipLabel: 'Transport Price', section: 'Buying' },
  { key: 'totalBuyingPricePresence', productKey: 'totalBuyingPrice', queryKey: 'totalBuyingPrice', label: 'Total Buying Price', chipLabel: 'Buying Price', section: 'Buying' },
  { key: 'b2bPriceInstantPresence', productKey: 'b2bPriceInstant', queryKey: 'b2bPriceInstant', label: 'B2B Price Instant', chipLabel: 'B2B Instant', section: 'Selling' },
  { key: 'b2bPriceOnRequestPresence', productKey: 'b2bPriceOnRequest', queryKey: 'b2bPriceOnRequest', label: 'B2B Price On Request', chipLabel: 'B2B On Request', section: 'Selling' },
  { key: 'b2cPriceInstantPresence', productKey: 'b2cPriceInstant', queryKey: 'b2cPriceInstant', label: 'B2C Price Instant', chipLabel: 'B2C Instant', section: 'Selling' },
  { key: 'b2cPriceOnRequestPresence', productKey: 'b2cPriceOnRequest', queryKey: 'b2cPriceOnRequest', label: 'B2C Price On Request', chipLabel: 'B2C On Request', section: 'Selling' },
  { key: 'extraHrB2BInstantPresence', productKey: 'extraHrB2BInstant', queryKey: 'extraHrB2BInstant', label: 'Extra Hr B2B Instant', chipLabel: 'Extra Hr B2B Instant', section: 'Selling' },
  { key: 'extraHrB2BRequestPresence', productKey: 'extraHrB2BRequest', queryKey: 'extraHrB2BRequest', label: 'Extra Hr B2B Request', chipLabel: 'Extra Hr B2B Request', section: 'Selling' },
  { key: 'extraHrB2CInstantPresence', productKey: 'extraHrB2CInstant', queryKey: 'extraHrB2CInstant', label: 'Extra Hr B2C Instant', chipLabel: 'Extra Hr B2C Instant', section: 'Selling' },
  { key: 'extraHrB2CRequestPresence', productKey: 'extraHrB2CRequest', queryKey: 'extraHrB2CRequest', label: 'Extra Hr B2C Request', chipLabel: 'Extra Hr B2C Request', section: 'Selling' },
  { key: 'tourValidityGeneralPresence', productKey: 'tourValidityGeneral', queryKey: 'tourValidityGeneral', label: 'Tour Validity General', chipLabel: 'Validity General', section: 'Validity' },
  { key: 'tourValiditySpecificPresence', productKey: 'tourValiditySpecific', queryKey: 'tourValiditySpecific', label: 'Tour Validity Specific', chipLabel: 'Validity Specific', section: 'Validity' },
  { key: 'cancelInstantPresence', productKey: 'cancelInstant', queryKey: 'cancelInstant', label: 'Cancel Instant', chipLabel: 'Cancel Instant', section: 'Validity' },
  { key: 'cutoffInstantPresence', productKey: 'cutoffInstant', queryKey: 'cutoffInstant', label: 'Cutoff Instant', chipLabel: 'Cutoff Instant', section: 'Validity' },
  { key: 'cancelOnRequestPresence', productKey: 'cancelOnRequest', queryKey: 'cancelOnRequest', label: 'Cancel On Request', chipLabel: 'Cancel On Request', section: 'Validity' },
  { key: 'cutoffOnRequestPresence', productKey: 'cutoffOnRequest', queryKey: 'cutoffOnRequest', label: 'Cutoff On Request', chipLabel: 'Cutoff On Request', section: 'Validity' },
  { key: 'notesGeneralPresence', productKey: 'notesGeneral', queryKey: 'notesGeneral', label: 'Notes General', chipLabel: 'Notes General', section: 'Notes' },
  { key: 'otaMasterSheetPresence', productKey: 'otaMasterSheet', queryKey: 'otaMasterSheet', label: 'OTA Master Sheet', chipLabel: 'OTA Master Sheet', section: 'OTA' },
  { key: 'otaTravmondePresence', productKey: 'otaTravmonde', queryKey: 'otaTravmonde', label: 'Travmonde', chipLabel: 'Travmonde', section: 'OTA' },
  { key: 'otaBookableToursPresence', productKey: 'otaBookableTours', queryKey: 'otaBookableTours', label: 'Bookable Tours', chipLabel: 'Bookable Tours', section: 'OTA' },
  { key: 'otaViatorPresence', productKey: 'otaViator', queryKey: 'otaViator', label: 'Viator', chipLabel: 'Viator', section: 'OTA' },
  { key: 'otaGygPresence', productKey: 'otaGyg', queryKey: 'otaGyg', label: 'GYG', chipLabel: 'GYG', section: 'OTA' },
  { key: 'otaHotelbedsPresence', productKey: 'otaHotelbeds', queryKey: 'otaHotelbeds', label: 'Hotelbeds', chipLabel: 'Hotelbeds', section: 'OTA' },
  { key: 'otaProjectExpeditionPresence', productKey: 'otaProjectExpedition', queryKey: 'otaProjectExpedition', label: 'Project Expedition', chipLabel: 'Project Expedition', section: 'OTA' },
  { key: 'otaAirbnbPresence', productKey: 'otaAirbnb', queryKey: 'otaAirbnb', label: 'Airbnb', chipLabel: 'Airbnb', section: 'OTA' },
  { key: 'otaBokunPresence', productKey: 'otaBokun', queryKey: 'otaBokun', label: 'Bokun', chipLabel: 'Bokun', section: 'OTA' },
  { key: 'otaTrekksoftPresence', productKey: 'otaTrekksoft', queryKey: 'otaTrekksoft', label: 'Trekksoft', chipLabel: 'Trekksoft', section: 'OTA' },
  { key: 'otaTuiMusementPresence', productKey: 'otaTuiMusement', queryKey: 'otaTuiMusement', label: 'TUI/Musement', chipLabel: 'TUI/Musement', section: 'OTA' },
  { key: 'otaKlookPresence', productKey: 'otaKlook', queryKey: 'otaKlook', label: 'Klook', chipLabel: 'Klook', section: 'OTA' },
  { key: 'otaToristyPresence', productKey: 'otaToristy', queryKey: 'otaToristy', label: 'Toristy', chipLabel: 'Toristy', section: 'OTA' },
  { key: 'otaTourHQPresence', productKey: 'otaTourHQ', queryKey: 'otaTourHQ', label: 'TourHQ', chipLabel: 'TourHQ', section: 'OTA' },
  { key: 'qualityRemarksPresence', productKey: 'qualityRemarks', queryKey: 'qualityRemarks', label: 'Quality Remarks', chipLabel: 'Quality Remarks', section: 'Upload' },
  { key: 'dateOfDispatchPresence', productKey: 'dateOfDispatch', queryKey: 'dateOfDispatch', label: 'Date of Dispatch', chipLabel: 'Dispatch Date', section: 'Upload' },
  { key: 'dateUploadedPresence', productKey: 'dateUploaded', queryKey: 'dateUploaded', label: 'Date Uploaded', chipLabel: 'Upload Date', section: 'Upload' },
  { key: 'productLinkPresence', productKey: 'productLink', queryKey: 'productLink', label: 'Product Link', chipLabel: 'Product Link', section: 'Upload' },
];

export function getActiveFilterCount(filters: Filters) {
  return Object.values(filters).reduce((count, value) => {
    if (Array.isArray(value)) return count + value.length;
    return value === 'all' ? count : count + 1;
  }, 0);
}

export function getActiveFilterCountForSection(filters: Filters, section: FilterSection) {
  let count = 0;
  for (const filter of MULTI_SELECT_FILTERS) {
    if (filter.section === section) count += filters[filter.key].length;
  }
  for (const filter of TRI_STATE_FILTERS) {
    if (filter.section === section && filters[filter.key] !== 'all') count += 1;
  }
  for (const filter of PRESENCE_FILTERS) {
    if (filter.section === section && filters[filter.key] !== 'all') count += 1;
  }
  return count;
}

export function asTriState(value: string | null): TriState {
  return value === 'yes' || value === 'no' ? value : 'all';
}

export function asPresenceState(value: string | null): PresenceState {
  if (value === 'yes') return 'has';
  if (value === 'no') return 'missing';
  return value === 'has' || value === 'missing' ? value : 'all';
}

export function getTriStateChipValue(value: TriState) {
  return value === 'yes' ? 'Yes' : 'No';
}

export function getPresenceChipValue(value: PresenceState) {
  return value === 'has' ? 'Has value' : 'Missing';
}

export function hasFilterableValue(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return !Number.isNaN(value);
  return typeof value === 'string' ? value.trim() !== '' : value !== null && value !== undefined;
}

export function matchesMultiFilter(value: unknown, selected: unknown) {
  if (!Array.isArray(selected) || selected.length === 0) return true;
  return selected.includes(value === null || value === undefined ? '' : String(value));
}

export function matchesTriStateFilter(value: unknown, filter: unknown) {
  if (filter === 'all') return true;
  return filter === 'yes' ? Boolean(value) : !Boolean(value);
}

export function matchesPresenceFilter(value: unknown, filter: unknown) {
  if (filter === 'all') return true;
  const present = hasFilterableValue(value);
  return filter === 'has' ? present : !present;
}
