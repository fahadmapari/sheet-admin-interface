import { auth } from '@/lib/auth';
import type { NextAuthRequest } from 'next-auth';
import { NextResponse } from 'next/server';

export default auth((req: NextAuthRequest) => {
  if (!req.auth) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!api/auth|_next|login|share|favicon\\.ico).*)',
  ],
};
