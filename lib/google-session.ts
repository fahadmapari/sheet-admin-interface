import 'server-only';
import { headers } from 'next/headers';
import { getToken } from 'next-auth/jwt';

export class GoogleAccessTokenError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = 'GoogleAccessTokenError';
    this.status = status;
  }
}

export async function requireGoogleAccessToken(): Promise<string> {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieName = isProd ? '__Secure-authjs.session-token' : 'authjs.session-token';

  const token = await getToken({
    req: { headers: await headers() },
    secret: process.env.NEXTAUTH_SECRET,
    cookieName,
    secureCookie: isProd,
  });

  if (!token?.email) {
    throw new GoogleAccessTokenError('Unauthorized', 401);
  }

  if (token.googleAuthError === 'RefreshAccessTokenError') {
    throw new GoogleAccessTokenError('Google access expired. Please sign out and sign back in.', 401);
  }

  if (token.googleAuthError === 'AccessRevoked') {
    throw new GoogleAccessTokenError('Access has been revoked. Please contact an administrator.', 403);
  }

  if (!token.accessToken) {
    throw new GoogleAccessTokenError('Missing Google access. Please sign out and sign back in.', 401);
  }

  return token.accessToken;
}
