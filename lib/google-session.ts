import 'server-only';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export class GoogleAccessTokenError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = 'GoogleAccessTokenError';
    this.status = status;
  }
}

export async function requireGoogleAccessToken(): Promise<string> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new GoogleAccessTokenError('Unauthorized', 401);
  }

  if (session.googleAuthError === 'RefreshAccessTokenError') {
    throw new GoogleAccessTokenError('Google access expired. Please sign out and sign back in.', 401);
  }

  if (!session.accessToken) {
    throw new GoogleAccessTokenError('Missing Google access. Please sign out and sign back in.', 401);
  }

  return session.accessToken;
}
