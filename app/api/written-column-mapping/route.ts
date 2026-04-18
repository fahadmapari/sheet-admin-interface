import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import {
  getEffectiveWrittenColumnMap,
  saveWrittenColumnMappingOverrides,
  clearWrittenColumnMappingOverrides,
  colIndexToLetter,
  WRITTEN_FIELD_TO_COL,
  WRITTEN_FIELD_LABELS,
} from '@/lib/written-column-mapping';

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

    const effectiveMap = await getEffectiveWrittenColumnMap();

    const entries = Object.entries(WRITTEN_FIELD_TO_COL)
      .sort(([, a], [, b]) => a - b)
      .map(([field, defaultColIndex]) => {
        const colIndex = effectiveMap[field] ?? defaultColIndex;
        return {
          field,
          fieldLabel: WRITTEN_FIELD_LABELS[field] ?? field,
          colIndex,
          colLetter: colIndexToLetter(colIndex),
          defaultColLetter: colIndexToLetter(defaultColIndex),
          sheetHeader: WRITTEN_FIELD_LABELS[field] ?? field,
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

    const validFields = new Set(Object.keys(WRITTEN_FIELD_TO_COL));
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

    await saveWrittenColumnMappingOverrides(body.overrides);
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

    await clearWrittenColumnMappingOverrides();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
