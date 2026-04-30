import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";

// Minimum scopes:
// - openid/email/profile: identity
// - spreadsheets: read/write the configured SPREADSHEET_ID (the user is invited to it as Editor)
// - drive.file: needed only by the "Export to Google Sheet" feature, which creates a new
//   spreadsheet in the user's own Drive. drive.file restricts the app to files it created
//   or files the user explicitly opened with the app — NOT the user's whole Drive.
//
// Sharing the configured spreadsheet with new users is performed by the service account,
// which is the file's editor; that path does not require Drive scope on the signed-in user.
const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
].join(' ');

const refreshInflight = new Map<string, Promise<JWT>>();

const ALLOWLIST_RECHECK_MS = 5 * 60 * 1000; // 5 minutes

async function isStillAllowed(email: string | undefined): Promise<boolean> {
  if (!email) return false;
  const { getAccessControl } = await import('./access-control');
  const { allowAll, allowedEmails, adminEmails } = await getAccessControl();
  if (allowAll) return true;
  const e = email.toLowerCase();
  return allowedEmails.includes(e) || adminEmails.includes(e);
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  if (!token.refreshToken) {
    return { ...token, googleAuthError: 'RefreshAccessTokenError' };
  }

  const key = token.refreshToken;

  const inflight = refreshInflight.get(key);
  if (inflight) return inflight;

  const promise = (async (): Promise<JWT> => {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          grant_type: 'refresh_token',
          refresh_token: key,
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
    } catch (err) {
      console.error('[auth] refreshAccessToken failed:', err);
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
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
      const { allowAll, allowedEmails, adminEmails } = await getAccessControl();
      if (allowAll) return true;
      const email = (user.email ?? '').toLowerCase();
      return allowedEmails.includes(email) || adminEmails.includes(email);
    },
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token ?? token.refreshToken;
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + Number(account.expires_in ?? 3600) * 1000;
        token.googleAuthError = undefined;
        token.allowlistCheckedAt = Date.now();
      }

      // Re-check allowlist periodically so admin removals take effect within 5 min.
      const lastChecked = token.allowlistCheckedAt ?? 0;
      if (Date.now() - lastChecked > ALLOWLIST_RECHECK_MS) {
        const allowed = await isStillAllowed(token.email ?? undefined);
        if (!allowed) {
          return { ...token, googleAuthError: 'AccessRevoked' };
        }
        token.allowlistCheckedAt = Date.now();
        if (token.googleAuthError === 'AccessRevoked') {
          token.googleAuthError = undefined;
        }
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
      session.googleAuthError = token.googleAuthError;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  jwt: {
    maxAge: 60 * 60 * 24 * 7,
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-authjs.session-token'
        : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
});
