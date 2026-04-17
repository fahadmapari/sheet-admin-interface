import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";

const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
].join(' ');

const refreshInflight = new Map<string, Promise<JWT>>();

async function refreshAccessToken(token: JWT): Promise<JWT> {
  const key = token.refreshToken ?? 'unknown';

  const inflight = refreshInflight.get(key);
  if (inflight) return inflight;

  const promise = (async (): Promise<JWT> => {
    try {
      if (!token.refreshToken) {
        throw new Error('Missing Google refresh token');
      }

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID ?? '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
          grant_type: 'refresh_token',
          refresh_token: token.refreshToken,
        }),
      });

      const refreshed = await response.json();
      if (!response.ok) {
        throw new Error(refreshed.error_description ?? refreshed.error ?? 'Failed to refresh Google access token');
      }

      return {
        ...token,
        accessToken: refreshed.access_token,
        accessTokenExpires: Date.now() + Number(refreshed.expires_in ?? 3600) * 1000,
        refreshToken: refreshed.refresh_token ?? token.refreshToken,
        googleAuthError: undefined,
      };
    } catch {
      return {
        ...token,
        googleAuthError: 'RefreshAccessTokenError',
      };
    }
  })();

  refreshInflight.set(key, promise);
  try {
    return await promise;
  } finally {
    refreshInflight.delete(key);
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: GOOGLE_SCOPES,
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const { getAccessControl } = await import('./access-control');
      const { allowAll, allowedEmails } = await getAccessControl();
      if (allowAll) return true;
      return allowedEmails.includes((user.email ?? '').toLowerCase());
    },
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token ?? token.refreshToken;
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + Number(account.expires_in ?? 3600) * 1000;
        token.googleAuthError = undefined;
      }

      if (!token.accessToken) {
        return token;
      }

      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires - 60_000) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.accessTokenExpires = token.accessTokenExpires;
      session.googleAuthError = token.googleAuthError;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  },
  jwt: {
    maxAge: 60 * 60 * 24 * 365, // 1 year
  },
};
