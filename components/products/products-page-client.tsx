'use client';

import { useSearchParams } from 'next/navigation';
import { ProductsClient } from '@/app/(app)/products/products-client';
import { DEFAULT_FILTERS, type Filters, type PresenceState, type TriState } from '@/components/products/filter-bar';

const ARRAY_QUERY_KEYS: Array<{ filterKey: keyof Filters; queryKey: string }> = [
  { filterKey: 'country', queryKey: 'country' },
  { filterKey: 'city', queryKey: 'city' },
  { filterKey: 'departments', queryKey: 'department' },
  { filterKey: 'regions', queryKey: 'region' },
  { filterKey: 'productTypes', queryKey: 'type' },
  { filterKey: 'durations', queryKey: 'duration' },
  { filterKey: 'statuses', queryKey: 'status' },
  { filterKey: 'isOkValues', queryKey: 'isOkValue' },
  { filterKey: 'maxPaxValues', queryKey: 'maxPax' },
  { filterKey: 'guideWhereValues', queryKey: 'guideWhere' },
  { filterKey: 'transportationValues', queryKey: 'transportation' },
  { filterKey: 'vatValues', queryKey: 'vat' },
  { filterKey: 'vatPercentValues', queryKey: 'vatPercent' },
  { filterKey: 'cancellationValues', queryKey: 'cancellation' },
  { filterKey: 'pics', queryKey: 'pic' },
  { filterKey: 'uploadedPics', queryKey: 'uploadedPic' },
  { filterKey: 'otaMasterSheetValues', queryKey: 'otaMasterSheetValue' },
  { filterKey: 'otaTravmondeValues', queryKey: 'otaTravmondeValue' },
  { filterKey: 'otaBookableToursValues', queryKey: 'otaBookableToursValue' },
  { filterKey: 'otaViatorValues', queryKey: 'otaViatorValue' },
  { filterKey: 'otaGygValues', queryKey: 'otaGygValue' },
  { filterKey: 'otaHotelbedsValues', queryKey: 'otaHotelbedsValue' },
  { filterKey: 'otaProjectExpeditionValues', queryKey: 'otaProjectExpeditionValue' },
  { filterKey: 'otaAirbnbValues', queryKey: 'otaAirbnbValue' },
  { filterKey: 'otaBokunValues', queryKey: 'otaBokunValue' },
  { filterKey: 'otaTrekksoftValues', queryKey: 'otaTrekksoftValue' },
  { filterKey: 'otaTuiMusementValues', queryKey: 'otaTuiMusementValue' },
  { filterKey: 'otaKlookValues', queryKey: 'otaKlookValue' },
  { filterKey: 'otaToristyValues', queryKey: 'otaToristyValue' },
  { filterKey: 'otaTourHQValues', queryKey: 'otaTourHQValue' },
];

const TRI_STATE_QUERY_KEYS: Array<{ filterKey: keyof Filters; queryKey: string }> = [
  { filterKey: 'readyForUpload', queryKey: 'ready' },
  { filterKey: 'written', queryKey: 'written' },
  { filterKey: 'ssOk', queryKey: 'ssOk' },
  { filterKey: 'guide', queryKey: 'guide' },
  { filterKey: 'driver', queryKey: 'driver' },
  { filterKey: 'driverGuide', queryKey: 'driverGuide' },
  { filterKey: 'attractionIncluded', queryKey: 'attractionIncluded' },
  { filterKey: 'attractionOptional', queryKey: 'attractionOptional' },
];

const PRESENCE_QUERY_KEYS: Array<{ filterKey: keyof Filters; queryKey: string }> = [
  { filterKey: 'linkPresence', queryKey: 'link' },
  { filterKey: 'productNamePresence', queryKey: 'productName' },
  { filterKey: 'notesPresence', queryKey: 'notes' },
  { filterKey: 'isOkPresence', queryKey: 'isOk' },
  { filterKey: 'imageLinksPresence', queryKey: 'imageLinks' },
  { filterKey: 'componentsOfTourPresence', queryKey: 'componentsOfTour' },
  { filterKey: 'attractionsIncludedPresence', queryKey: 'attractionsIncluded' },
  { filterKey: 'attractionLinkPresence', queryKey: 'attractionLink' },
  { filterKey: 'providerPricePresence', queryKey: 'providerPrice' },
  { filterKey: 'providerUrlPresence', queryKey: 'providerUrl' },
  { filterKey: 'centralProviderLinksPresence', queryKey: 'centralProviderLinks' },
  { filterKey: 'centralTransportLinksPresence', queryKey: 'centralTransportLinks' },
  { filterKey: 'transportationPricePresence', queryKey: 'transportationPrice' },
  { filterKey: 'totalBuyingPricePresence', queryKey: 'totalBuyingPrice' },
  { filterKey: 'b2bPriceInstantPresence', queryKey: 'b2bPriceInstant' },
  { filterKey: 'b2bPriceOnRequestPresence', queryKey: 'b2bPriceOnRequest' },
  { filterKey: 'b2cPriceInstantPresence', queryKey: 'b2cPriceInstant' },
  { filterKey: 'b2cPriceOnRequestPresence', queryKey: 'b2cPriceOnRequest' },
  { filterKey: 'extraHrB2BInstantPresence', queryKey: 'extraHrB2BInstant' },
  { filterKey: 'extraHrB2BRequestPresence', queryKey: 'extraHrB2BRequest' },
  { filterKey: 'extraHrB2CInstantPresence', queryKey: 'extraHrB2CInstant' },
  { filterKey: 'extraHrB2CRequestPresence', queryKey: 'extraHrB2CRequest' },
  { filterKey: 'tourValidityGeneralPresence', queryKey: 'tourValidityGeneral' },
  { filterKey: 'tourValiditySpecificPresence', queryKey: 'tourValiditySpecific' },
  { filterKey: 'cancelInstantPresence', queryKey: 'cancelInstant' },
  { filterKey: 'cutoffInstantPresence', queryKey: 'cutoffInstant' },
  { filterKey: 'cancelOnRequestPresence', queryKey: 'cancelOnRequest' },
  { filterKey: 'cutoffOnRequestPresence', queryKey: 'cutoffOnRequest' },
  { filterKey: 'notesGeneralPresence', queryKey: 'notesGeneral' },
  { filterKey: 'otaMasterSheetPresence', queryKey: 'otaMasterSheet' },
  { filterKey: 'otaTravmondePresence', queryKey: 'otaTravmonde' },
  { filterKey: 'otaBookableToursPresence', queryKey: 'otaBookableTours' },
  { filterKey: 'otaViatorPresence', queryKey: 'otaViator' },
  { filterKey: 'otaGygPresence', queryKey: 'otaGyg' },
  { filterKey: 'otaHotelbedsPresence', queryKey: 'otaHotelbeds' },
  { filterKey: 'otaProjectExpeditionPresence', queryKey: 'otaProjectExpedition' },
  { filterKey: 'otaAirbnbPresence', queryKey: 'otaAirbnb' },
  { filterKey: 'otaBokunPresence', queryKey: 'otaBokun' },
  { filterKey: 'otaTrekksoftPresence', queryKey: 'otaTrekksoft' },
  { filterKey: 'otaTuiMusementPresence', queryKey: 'otaTuiMusement' },
  { filterKey: 'otaKlookPresence', queryKey: 'otaKlook' },
  { filterKey: 'otaToristyPresence', queryKey: 'otaToristy' },
  { filterKey: 'otaTourHQPresence', queryKey: 'otaTourHQ' },
  { filterKey: 'qualityRemarksPresence', queryKey: 'qualityRemarks' },
  { filterKey: 'dateOfDispatchPresence', queryKey: 'dateOfDispatch' },
  { filterKey: 'dateUploadedPresence', queryKey: 'dateUploaded' },
  { filterKey: 'productLinkPresence', queryKey: 'productLink' },
];

function asTriState(value: string | null): TriState {
  return value === 'yes' || value === 'no' ? value : 'all';
}

function asPresenceState(value: string | null): PresenceState {
  if (value === 'yes') return 'has';
  if (value === 'no') return 'missing';
  return value === 'has' || value === 'missing' ? value : 'all';
}

export function ProductsPageClient() {
  const searchParams = useSearchParams();
  const countries = searchParams.getAll('country');
  const cities = searchParams.getAll('city');
  const legacyCountry = searchParams.get('country');
  const legacyCity = searchParams.get('city');

  const initialFilters: Filters = { ...DEFAULT_FILTERS };
  const mutableInitialFilters = initialFilters as unknown as Record<string, unknown>;
  ARRAY_QUERY_KEYS.forEach(({ filterKey, queryKey }) => {
    const values = searchParams.getAll(queryKey);
    if (Array.isArray(initialFilters[filterKey])) {
      mutableInitialFilters[filterKey] = values;
    }
  });
  initialFilters.country = countries.length > 0 ? countries : (legacyCountry ? [legacyCountry] : DEFAULT_FILTERS.country);
  initialFilters.city = cities.length > 0 ? cities : (legacyCity ? [legacyCity] : DEFAULT_FILTERS.city);
  TRI_STATE_QUERY_KEYS.forEach(({ filterKey, queryKey }) => {
    mutableInitialFilters[filterKey] = asTriState(searchParams.get(queryKey));
  });
  PRESENCE_QUERY_KEYS.forEach(({ filterKey, queryKey }) => {
    mutableInitialFilters[filterKey] = asPresenceState(searchParams.get(queryKey));
  });
  const initialSearch = searchParams.get('q') ?? '';

  return <ProductsClient initialFilters={initialFilters} initialSearch={initialSearch} />;
}
