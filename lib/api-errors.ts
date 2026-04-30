import 'server-only';
import { NextResponse } from 'next/server';
import { GoogleAccessTokenError } from './google-session';

// Returns a sanitized error response. The original error is logged server-side
// but the response body never leaks internal messages (Mongo error text,
// Google API error details, stack frames, file paths, etc.) to the client.
export function errorResponse(err: unknown, fallbackStatus = 500): NextResponse {
  if (err instanceof GoogleAccessTokenError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  console.error('[api]', err);
  return NextResponse.json({ error: 'Internal error' }, { status: fallbackStatus });
}
