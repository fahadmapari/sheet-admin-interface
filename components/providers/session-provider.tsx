// components/providers/session-provider.tsx
"use client";

import { useEffect, type ReactNode } from "react";
import { SessionProvider as NextAuthSessionProvider, signOut, useSession } from "next-auth/react";

function SessionErrorWatcher() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.googleAuthError === 'RefreshAccessTokenError') {
      void signOut({ callbackUrl: '/login' });
    }
  }, [session?.googleAuthError]);

  return null;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <SessionErrorWatcher />
      {children}
    </NextAuthSessionProvider>
  );
}
