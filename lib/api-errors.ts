import 'server-only';
import { NextResponse } from 'next/server';
import { GoogleAccessTokenError } from './google-session';
import { isSheetPermissionError } from './sheet-errors';
import { SHEET_ACCESS_DENIED_CODE } from './fetcher';

// Returns a sanitized error response. The original error is logged server-side
// but the response body never leaks internal messages (Mongo error text,
// Google API error details, stack frames, file paths, etc.) to the client.
export function errorResponse(err: unknown, fallbackStatus = 500): NextResponse {
  if (err instanceof GoogleAccessTokenError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  if (isSheetPermissionError(err)) {
    return NextResponse.json(
      {
        code: SHEET_ACCESS_DENIED_CODE,
        error: 'Your Google account does not have access to the configured spreadsheet.',
      },
      { status: 403 },
    );
  }

  console.error('[api]', err);
  return NextResponse.json({ error: 'Internal error' }, { status: fallbackStatus });
}
