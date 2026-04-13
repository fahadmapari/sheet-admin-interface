import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { GoogleAccessTokenError, requireGoogleAccessToken } from '@/lib/google-session';
import { getSpreadsheetCapabilities, shareSpreadsheetWithUser } from '@/lib/sheets';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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

    const accessToken = await requireGoogleAccessToken();
    const capabilities = await getSpreadsheetCapabilities(accessToken);
    if (!capabilities?.canShare) {
      return NextResponse.json(
        { error: 'Your Google account does not have permission to share this spreadsheet.' },
        { status: 403 },
      );
    }

    const status = await shareSpreadsheetWithUser(accessToken, email);
    return NextResponse.json({ ok: true, status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err instanceof GoogleAccessTokenError ? err.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
