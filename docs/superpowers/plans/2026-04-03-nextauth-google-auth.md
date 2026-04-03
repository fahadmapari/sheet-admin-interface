# NextAuth Google Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect all routes with NextAuth Google OAuth, restricting access to emails in `ALLOWED_EMAILS`, with a standalone `/login` page and JWT sessions.

**Architecture:** Middleware (`middleware.ts`) guards all routes, redirecting unauthenticated requests to `/login`. App Router route groups split the layout: `(app)` gets the sidebar/header shell, `(auth)` gets a minimal wrapper for the login page. NextAuth `signIn` callback enforces the email allowlist.

**Tech Stack:** next-auth v4, Next.js 14 App Router, TypeScript, Tailwind CSS, Radix UI (for button styling), Lucide React (for Google icon)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `app/api/auth/[...nextauth]/route.ts` | NextAuth handler: Google provider + allowlist callback |
| Create | `components/providers/session-provider.tsx` | Client wrapper for `next-auth/react` SessionProvider |
| Modify | `app/layout.tsx` | Strip sidebar/header; add SessionProvider; keep ThemeProvider |
| Create | `app/(app)/layout.tsx` | Sidebar + Header shell (content moved from old root layout) |
| Move | `app/page.tsx` → `app/(app)/page.tsx` | Dashboard (no URL change — route groups are transparent) |
| Move | `app/loading.tsx` → `app/(app)/loading.tsx` | Root loading state |
| Move | `app/error.tsx` → `app/(app)/error.tsx` | Root error boundary |
| Move | `app/products/` → `app/(app)/products/` | Products pages |
| Move | `app/assembly/` → `app/(app)/assembly/` | Assembly pages |
| Create | `app/(auth)/layout.tsx` | Minimal layout: no sidebar/header, just ThemeProvider wrapper |
| Create | `app/(auth)/login/page.tsx` | Server component: reads `?error` searchParam, renders sign-in UI |
| Create | `app/(auth)/login/sign-in-button.tsx` | `'use client'` button that calls `signIn("google")` |
| Create | `middleware.ts` | `withAuth` re-export that redirects to `/login` |
| Modify | `.env.local` | Replace placeholder `NEXTAUTH_SECRET` with a real secret |

---

## Task 1: Create NextAuth Route Handler

**Files:**
- Create: `app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Create the handler file**

```ts
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const allowed = process.env.ALLOWED_EMAILS?.split(",").map((e) => e.trim()) ?? [];
      return allowed.includes(user.email ?? "");
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors from the new file.

- [ ] **Step 3: Commit**

```bash
git add app/api/auth/[...nextauth]/route.ts
git commit -m "feat: add NextAuth route handler with Google provider and email allowlist"
```

---

## Task 2: Fix NEXTAUTH_SECRET

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Generate a secret and update .env.local**

Run: `openssl rand -base64 32`

Copy the output and replace the placeholder in `.env.local`:

```
NEXTAUTH_SECRET=<output from openssl command>
```

(Do not commit `.env.local` — it is gitignored.)

---

## Task 3: Create SessionProvider Component

**Files:**
- Create: `components/providers/session-provider.tsx`

- [ ] **Step 1: Create the provider**

```tsx
// components/providers/session-provider.tsx
"use client";

import type { ReactNode } from "react";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export function SessionProvider({ children }: { children: ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/providers/session-provider.tsx
git commit -m "feat: add SessionProvider client wrapper"
```

---

## Task 4: Restructure App Directory with Route Groups

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/(app)/layout.tsx`
- Move: `app/page.tsx` → `app/(app)/page.tsx`
- Move: `app/loading.tsx` → `app/(app)/loading.tsx`
- Move: `app/error.tsx` → `app/(app)/error.tsx`
- Move: `app/products/` → `app/(app)/products/`
- Move: `app/assembly/` → `app/(app)/assembly/`

- [ ] **Step 1: Move page files into the (app) route group**

```bash
mkdir -p app/\(app\)/products app/\(app\)/assembly
git mv app/page.tsx app/\(app\)/page.tsx
git mv app/loading.tsx app/\(app\)/loading.tsx
git mv app/error.tsx app/\(app\)/error.tsx
git mv app/products/page.tsx app/\(app\)/products/page.tsx
git mv app/products/loading.tsx app/\(app\)/products/loading.tsx
git mv app/products/products-client.tsx app/\(app\)/products/products-client.tsx
git mv app/assembly/page.tsx app/\(app\)/assembly/page.tsx
git mv app/assembly/assembly-client.tsx app/\(app\)/assembly/assembly-client.tsx
# Clean up now-empty dirs
rmdir app/products app/assembly
```

Note: Route groups named `(app)` and `(auth)` do **not** affect URL paths. `/products` still resolves to `app/(app)/products/page.tsx`.

- [ ] **Step 2: Check for [rowIndex] nested route under products**

The products directory also has `[rowIndex]/page.tsx`. Move it:

```bash
mkdir -p app/\(app\)/products/\[rowIndex\]
git mv "app/products/[rowIndex]/page.tsx" "app/(app)/products/[rowIndex]/page.tsx"
rmdir "app/products/[rowIndex]"
```

- [ ] **Step 3: Create `app/(app)/layout.tsx`** with the sidebar/header shell (extracted from current root layout)

```tsx
// app/(app)/layout.tsx
import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="mx-auto flex h-full min-h-0 w-full max-w-screen-xl flex-1 flex-col overflow-y-auto px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update `app/layout.tsx`** to be a minimal root with providers only

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SessionProvider } from "@/components/providers/session-provider";

export const metadata: Metadata = {
  title: "Sheet Admin — Tour Products",
  description: "Admin panel for managing tour product data",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} h-screen overflow-hidden antialiased`}>
        <SessionProvider>
          <ThemeProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                classNames: {
                  toast:
                    "border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--text-primary))] shadow-md",
                  description: "text-[hsl(var(--text-secondary))]",
                  actionButton:
                    "bg-[hsl(var(--text-primary))] text-[hsl(var(--background))]",
                  cancelButton:
                    "border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--text-primary))]",
                },
              }}
            />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx "app/(app)/layout.tsx" "app/(app)/page.tsx" "app/(app)/loading.tsx" "app/(app)/error.tsx" "app/(app)/products/" "app/(app)/assembly/"
git commit -m "feat: restructure app with route groups for auth layout separation"
```

---

## Task 5: Create Login Page

**Files:**
- Create: `app/(auth)/layout.tsx`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/login/sign-in-button.tsx`

- [ ] **Step 1: Create `app/(auth)/layout.tsx`** — minimal wrapper, no sidebar/header

```tsx
// app/(auth)/layout.tsx
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(auth)/login/sign-in-button.tsx`** — client component for the Google sign-in action

```tsx
// app/(auth)/login/sign-in-button.tsx
"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/" })}
      className="flex items-center gap-3 rounded-lg border border-border bg-background px-5 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      Sign in with Google
    </button>
  );
}
```

- [ ] **Step 3: Create `app/(auth)/login/page.tsx`** — server component that reads the error param

```tsx
// app/(auth)/login/page.tsx
import { SignInButton } from "./sign-in-button";

const errorMessages: Record<string, string> = {
  AccessDenied: "Your email is not authorized to access this app.",
  OAuthSignin: "Could not start sign-in. Try again.",
  OAuthCallback: "Sign-in failed. Try again.",
  Default: "Something went wrong. Try again.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const errorMessage = searchParams.error
    ? (errorMessages[searchParams.error] ?? errorMessages.Default)
    : null;

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-xl border border-border bg-background p-8 shadow-md">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-xl font-semibold text-foreground">Sheet Admin</h1>
        <p className="text-sm text-muted-foreground">Sign in to continue</p>
      </div>

      {errorMessage && (
        <p className="w-full rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      <SignInButton />
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add "app/(auth)/layout.tsx" "app/(auth)/login/page.tsx" "app/(auth)/login/sign-in-button.tsx"
git commit -m "feat: add login page with Google sign-in button and error display"
```

---

## Task 6: Create Middleware

**Files:**
- Create: `middleware.ts` (project root)

- [ ] **Step 1: Create middleware**

```ts
// middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)",
  ],
};
```

The `matcher` pattern excludes:
- `api/auth/*` — NextAuth's own callback routes
- `_next/static`, `_next/image` — Next.js static assets
- `favicon.ico` — browser default request
- `login` — the login page itself

Any other path (including `/`, `/products`, `/assembly`) requires a valid session.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Start dev server and manually verify**

Run: `npm run dev`

Test the following:
1. Visit `http://localhost:3000` in an incognito window → should redirect to `http://localhost:3000/login`
2. Visit `http://localhost:3000/products` → should redirect to `/login`
3. Visit `http://localhost:3000/login` → should show the login card without sidebar/header
4. Click "Sign in with Google" → completes OAuth → lands on `/`
5. Visit `http://localhost:3000/products` → should load normally
6. Test with an email NOT in `ALLOWED_EMAILS` to verify the Access Denied error appears on `/login`

- [ ] **Step 4: Commit**

```bash
git add middleware.ts
git commit -m "feat: add NextAuth middleware to protect all routes"
```

---

## Self-Review Notes

- All spec requirements covered: middleware guard, Google provider, allowlist callback, JWT sessions, `/login` page with error display, no MongoDB for sessions.
- `NEXTAUTH_SECRET` update is Task 2 — noted as not committed (stays local).
- Route group file moves preserve all existing URLs — `(app)` and `(auth)` are transparent to the router.
- `withAuth` in middleware reads the JWT cookie set by the NextAuth handler; the `pages.signIn` option tells it where to redirect on failure.
