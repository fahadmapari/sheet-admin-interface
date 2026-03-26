import { NextResponse } from 'next/server';
import { fetchInventoryUpdate } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await fetchInventoryUpdate();
    return NextResponse.json({ rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
