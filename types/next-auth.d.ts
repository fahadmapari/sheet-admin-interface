import 'next-auth';

declare module 'next-auth' {
  interface Session {
    googleAuthError?: 'RefreshAccessTokenError' | 'AccessRevoked';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    googleAuthError?: 'RefreshAccessTokenError' | 'AccessRevoked';
    allowlistCheckedAt?: number;
  }
}
