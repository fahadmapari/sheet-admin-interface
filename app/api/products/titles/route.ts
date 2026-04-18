import { NextResponse } from 'next/server';
import { fetchAllRows } from '@/lib/sheets';
import { GoogleAccessTokenError, requireGoogleAccessToken } from '@/lib/google-session';
import { parseLinkField } from '@/lib/utils';
import { getEffectiveColumnMap } from '@/lib/column-mapping';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const accessToken = await requireGoogleAccessToken();
    const sheetsAuth = { auth: 'user' as const, accessToken };
    const [colMap, rows] = await Promise.all([
      getEffectiveColumnMap(),
      fetchAllRows(sheetsAuth),
    ]);

    const linkColIndex = colMap['link'];
    const titlesSet = new Set<string>();
    for (const row of rows.slice(1)) {
      const raw = (row[linkColIndex] ?? '').toString().trim();
      if (raw) {
        const title = parseLinkField(raw).text.toLowerCase();
        if (title) titlesSet.add(title);
      }
    }

    return NextResponse.json({ titles: [...titlesSet] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err instanceof GoogleAccessTokenError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
