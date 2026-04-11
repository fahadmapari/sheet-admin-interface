import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import {
  getEffectiveColumnMap,
  saveColumnMappingOverrides,
  clearColumnMappingOverrides,
  colIndexToLetter,
} from '@/lib/column-mapping';
import { COLUMN_HEADERS, FIELD_LABELS, FIELD_TO_COL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(session.user.email))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const effectiveMap = await getEffectiveColumnMap(); // field → colIndex

    // Build response array sorted by default column order (A first)
    const entries = Object.entries(FIELD_TO_COL)
      .sort(([, a], [, b]) => a - b)
      .map(([field, defaultColIndex]) => {
        const colIndex = effectiveMap[field] ?? defaultColIndex;
        return {
          field,
          fieldLabel: FIELD_LABELS[field as keyof typeof FIELD_LABELS] ?? field,
          colIndex,
          colLetter: colIndexToLetter(colIndex),
          defaultColLetter: colIndexToLetter(defaultColIndex),
          sheetHeader: COLUMN_HEADERS[defaultColIndex] ?? '',
          isOverridden: colIndex !== defaultColIndex,
        };
      });

    return NextResponse.json(entries);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(session.user.email))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json() as { overrides: Record<string, number> };
    if (!body?.overrides || typeof body.overrides !== 'object') {
      return NextResponse.json({ error: 'Invalid body: expected { overrides: {...} }' }, { status: 400 });
    }

    const validFields = new Set(Object.keys(FIELD_TO_COL));
    const seenIndices = new Map<number, string>();
    const errors: string[] = [];

    for (const [field, idx] of Object.entries(body.overrides)) {
      if (!validFields.has(field)) {
        errors.push(`Unknown field: ${field}`);
        continue;
      }
      if (typeof idx !== 'number' || !Number.isInteger(idx) || idx < 0 || idx > 69) {
        errors.push(`Field "${field}": colIndex must be an integer 0–69, got ${idx}`);
        continue;
      }
      if (seenIndices.has(idx)) {
        errors.push(`Duplicate column index ${idx} used by both "${seenIndices.get(idx)}" and "${field}"`);
      } else {
        seenIndices.set(idx, field);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
    }

    await saveColumnMappingOverrides(body.overrides);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(session.user.email))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await clearColumnMappingOverrides();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
