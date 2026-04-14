import { NextRequest, NextResponse } from 'next/server';
import { GoogleAccessTokenError, requireGoogleAccessToken } from '@/lib/google-session';
import { createSpreadsheetAsUser } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const accessToken = await requireGoogleAccessToken();
    const { title, fields, rows } = (await req.json()) as {
      title: string;
      fields: string[];
      rows: string[][];
    };

    if (
      typeof title !== 'string' ||
      !Array.isArray(fields) ||
      !Array.isArray(rows)
    ) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (rows.length > 5000) {
      return NextResponse.json({ error: 'Too many rows (max 5000)' }, { status: 400 });
    }

    const url = await createSpreadsheetAsUser(accessToken, title, fields, rows);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err instanceof GoogleAccessTokenError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
