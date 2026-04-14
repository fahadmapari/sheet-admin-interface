import { NextResponse } from 'next/server';
import { fetchAllRows } from '@/lib/sheets';
import { GoogleAccessTokenError, requireGoogleAccessToken } from '@/lib/google-session';
import { getEffectiveColumnMap } from '@/lib/column-mapping';
import { toText } from '@/lib/utils';
import type { FiltersResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const accessToken = await requireGoogleAccessToken();
    const [rows, colMap] = await Promise.all([
      fetchAllRows({ auth: 'user', accessToken }),
      getEffectiveColumnMap(),
    ]);
    const data = rows.slice(1); // skip header

    const unique = (field: string): string[] => {
      const col = colMap[field];
      if (col === undefined) return [];
      const set = new Set<string>();
      for (const row of data) {
        const val = toText(row[col]);
        if (val) set.add(val);
      }
      return Array.from(set).sort();
    };

    const filters: FiltersResponse = {
      countries: unique('country'),
      cities: unique('city'),
      departments: unique('department'),
      regions: unique('region'),
      productTypes: unique('productType'),
      durations: unique('duration'),
      statuses: unique('productStatus'),
      isOkValues: unique('isOk'),
      maxPaxValues: unique('maxPax'),
      guideWhereValues: unique('guideWhere'),
      transportationValues: unique('transportation'),
      vatValues: unique('vatYN'),
      vatPercentValues: unique('vatPercent'),
      cancellationValues: unique('cancellation'),
      pics: unique('pic'),
      uploadedPics: unique('uploadedPic'),
      otaMasterSheetValues: unique('otaMasterSheet'),
      otaTravmondeValues: unique('otaTravmonde'),
      otaBookableToursValues: unique('otaBookableTours'),
      otaViatorValues: unique('otaViator'),
      otaGygValues: unique('otaGyg'),
      otaHotelbedsValues: unique('otaHotelbeds'),
      otaProjectExpeditionValues: unique('otaProjectExpedition'),
      otaAirbnbValues: unique('otaAirbnb'),
      otaBokunValues: unique('otaBokun'),
      otaTrekksoftValues: unique('otaTrekksoft'),
      otaTuiMusementValues: unique('otaTuiMusement'),
      otaKlookValues: unique('otaKlook'),
      otaToristyValues: unique('otaToristy'),
      otaTourHQValues: unique('otaTourHQ'),
    };

    return NextResponse.json(filters);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err instanceof GoogleAccessTokenError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
