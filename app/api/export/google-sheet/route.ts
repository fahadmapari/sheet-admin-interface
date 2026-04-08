import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createSpreadsheetAsUser } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!session.accessToken) {
    return NextResponse.json(
      { error: 'Missing Drive access — please sign out and sign back in' },
      { status: 401 },
    );
  }

  try {
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

    const url = await createSpreadsheetAsUser(session.accessToken, title, fields, rows);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
