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
