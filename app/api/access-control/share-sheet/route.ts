import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { getSpreadsheetCapabilities, shareSpreadsheetWithUser } from '@/lib/sheets';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(session.user.email))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await req.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase() ?? '';
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    // Sharing is performed by the service account. Verify the service account itself
    // has share permission on the configured spreadsheet before attempting to share.
    const capabilities = await getSpreadsheetCapabilities();
    if (!capabilities?.canShare) {
      return NextResponse.json(
        { error: 'The configured service account is not allowed to share this spreadsheet. Grant it Editor access with "Editors can share" enabled.' },
        { status: 403 },
      );
    }

    const status = await shareSpreadsheetWithUser(email);
    return NextResponse.json({ ok: true, status });
  } catch (err) {
    return errorResponse(err);
  }
}
