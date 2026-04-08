import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createAndShareSpreadsheet } from '@/lib/sheets';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, fields, rows } = (await req.json()) as {
      title: string;
      fields: string[];
      rows: string[][];
    };

    const url = await createAndShareSpreadsheet(title, fields, rows, session.user.email);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
