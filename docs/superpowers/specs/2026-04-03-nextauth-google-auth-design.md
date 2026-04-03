# NextAuth Google Auth — Design Spec

**Date:** 2026-04-03

## Overview

Protect the entire sheet-admin-interface app with NextAuth.js Google OAuth. All routes require authentication. Access is restricted to emails listed in `ALLOWED_EMAILS`. Unauthenticated users are redirected to a login page.

## Architecture

### New files

- `middleware.ts` (project root) — uses `withAuth` from `next-auth/middleware`. Redirects unauthenticated requests to `/login`. Excludes `/login` and `/api/auth/*` from protection.
- `app/api/auth/[...nextauth]/route.ts` — NextAuth catch-all route handler. Configures the Google provider and a `signIn` callback that rejects emails not in `ALLOWED_EMAILS`.
- `app/login/page.tsx` — standalone login page (no sidebar/header). Shows a "Sign in with Google" button and an "Access denied" error message when `?error=AccessDenied` is present in the URL.
- `components/providers/session-provider.tsx` — thin client component wrapping `SessionProvider` from `next-auth/react`.

### Modified files

- `app/layout.tsx` — wrap children with `SessionProvider` so `useSession()` works on client components.

## Data Flow

1. User visits any route → middleware checks for NextAuth session JWT cookie
2. No valid session → redirect to `/login`
3. User clicks "Sign in with Google" → Google OAuth flow
4. NextAuth `signIn` callback checks email against `ALLOWED_EMAILS` (comma-separated env var)
   - Not in list → return `false` → redirect to `/login?error=AccessDenied`
   - In list → session created, redirect to original URL (or `/`)
5. `/login` reads `?error` query param and shows appropriate message

## Session Strategy

JWT (stateless). No database session storage. The existing MongoDB connection is not used for auth.

## Environment Variables (already in .env.local)

- `NEXTAUTH_URL` — base URL for callbacks
- `NEXTAUTH_SECRET` — must be set to a real secret (currently placeholder)
- `GOOGLE_CLIENT_ID` — Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` — Google OAuth client secret
- `ALLOWED_EMAILS` — comma-separated list of allowed email addresses

## Error Handling

- Email not in allowlist → NextAuth rejects sign-in, redirects to `/login?error=AccessDenied`, login page shows "Access denied" message
- OAuth failure (network, misconfiguration) → NextAuth default error handling, `/login?error=...`

## Out of Scope

- Role-based access control
- Session persistence in MongoDB
- Logout UI (can be added later via `signOut()`)
