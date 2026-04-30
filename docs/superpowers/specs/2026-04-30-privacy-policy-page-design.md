# Public Privacy Policy Page — Design

**Date:** 2026-04-30
**Owner:** Fahad Mapari
**Purpose:** Provide a publicly reachable privacy policy URL that satisfies Google OAuth verification requirements for the `drive.file` and `spreadsheets` scopes used by sheet-admin.

## Goals

- Publish a `/privacy` page that is reachable without sign-in.
- Disclose, per Google's OAuth verification requirements, what data each requested scope accesses and how it is used.
- Include the verbatim "Limited Use" language Google requires for apps using restricted/sensitive Drive scopes.
- Make the page discoverable from the login screen (the surface where the OAuth consent flow originates).

## Non-Goals

- Cookie consent banner / GDPR-specific consent UI.
- A separate Terms of Service page.
- Localisation. The page is English-only.
- Analytics, audit logging, or change-tracking for policy revisions beyond a "Last updated" date.

## Architecture

### Route

- File: `app/privacy/page.tsx`
- URL: `/privacy`
- Server component, statically renderable. No data fetching, no client-side state.

The page lives at the root of `app/` (not under `(app)` or `(auth)`) so it has no auth chrome and no layout dependency on a signed-in session.

### Public access

The matcher in `proxy.ts:17` currently excludes `api/auth`, `_next`, `login`, `share`, and `favicon.ico`. Add `privacy$|privacy/` to the excluded patterns so unauthenticated requests reach the page directly without the redirect-to-login behaviour.

Updated matcher pattern:

```
/((?!api/auth$|api/auth/|_next/|login$|login/|share$|share/|privacy$|privacy/|favicon\.ico$).*)
```

The trailing-slash / `$` anchors are kept consistent with the existing patterns to prevent prefix-collision bypasses.

### Layout & styling

- Single-column prose layout, max width ~720px, centred.
- Reuses Tailwind tokens from the existing design system (`text-foreground`, `text-muted-foreground`, `border-border`, etc.) so the page matches the login screen visually.
- Top of page: app name ("Sheet Admin"), "Last updated: April 30, 2026".
- Table of contents with anchor links to each section.
- No sidebar, no top bar, no auth chrome.

### Login page link

Add a small "Privacy" link beneath the sign-in button on `app/(auth)/login/page.tsx`. Plain `<Link>` to `/privacy`, muted-foreground colour, small text. This is the surface the Google OAuth consent screen links back into, so visibility here matters for verification reviewers.

## Content

The page contains the following sections, in order. Wording is finalized in implementation; this spec fixes structure and required claims.

1. **Who we are**
   - Operator: Fahad Mapari (individual).
   - Contact email: `btechy4@gmail.com`.
   - Jurisdiction: India.

2. **Who can use this app**
   - Sheet Admin is an internal/closed tool. Access is restricted to a manually maintained allowlist of email addresses. It is not a public service and does not accept self-service signups.

3. **Information we access via your Google Account**
   - Per-scope disclosure. Each bullet names the scope and the user-facing feature it powers:
     - `openid`, `email`, `profile` — used to identify you, display your name/avatar, and check your email against the access allowlist.
     - `https://www.googleapis.com/auth/spreadsheets` — used to read and write the single configured "NET RATES" Google Sheet that you have been separately granted access to. We do not enumerate or access any other spreadsheets in your Drive.
     - `https://www.googleapis.com/auth/drive.file` — used only when you click "Export to Google Sheets". A new spreadsheet is created in your Drive and we retain access only to that file. We cannot list, read, or modify any other files in your Drive.

4. **Limited Use disclosure** (verbatim Google language)
   - Sheet Admin's use and transfer of information received from Google APIs to any other app will adhere to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.
   - Plain-language restatement: we do not use Google user data for advertising, do not sell it, do not transfer it to third parties except as needed to provide the service or as required by law, do not allow humans to read it (except with your consent, for security/debugging, or as required by law), and do not use it to develop, improve, or train generalized AI/ML models.

5. **Information we store**
   - MongoDB (database `sheet-admin`):
     - `accesscontrol` — list of allowed email addresses and admin emails.
     - `assemblybatches`, `stageconfig` — assembly workflow state you create in the app.
     - `notifications`, `notificationsubscriptions` — in-app notifications and your subscription preferences.
     - Column group / column mapping configuration documents.
   - We do not cache or mirror Google Sheet rows in our own database. Sheet content is read on demand for each request and written straight back to Google Sheets.
   - OAuth refresh/access tokens are stored in the encrypted NextAuth session cookie on your device, not in our database.

6. **Cookies & local storage**
   - One session cookie set by NextAuth (`next-auth.session-token` / equivalent). Used solely to keep you signed in. No advertising or analytics cookies.
   - Minor UI preferences (e.g. sidebar collapse state, column views) may be stored in your browser's `localStorage`. These never leave your device.

7. **Third parties**
   - Google — authentication, Google Sheets, and Google Drive APIs.
   - MongoDB Atlas (or the hosting provider used for the MongoDB instance) — database hosting.
   - The hosting platform serving the Next.js app.
   - No analytics, advertising, marketing, or tracking vendors.

8. **Retention & deletion**
   - Data tied to your account is retained for as long as your email remains on the allowlist.
   - When your email is removed from the allowlist, you lose access immediately (re-checked in the JWT callback every 5 minutes). Data you authored (assembly batches, notifications) may remain in MongoDB for ongoing business use unless deletion is requested.
   - To request deletion of data tied to your account, email `btechy4@gmail.com`.

9. **Your rights**
   - Access, correction, and deletion: contact `btechy4@gmail.com`.
   - Revoking Google access: visit `https://myaccount.google.com/permissions` and remove "Sheet Admin". This revokes our OAuth tokens immediately.

10. **Changes to this policy**
    - Material changes are reflected in the "Last updated" date at the top. We may notify users in-app for significant changes.

11. **Contact**
    - Privacy questions: `btechy4@gmail.com`.

## Components / Files

- New: `app/privacy/page.tsx` — server component rendering the policy.
- Edited: `proxy.ts` — add `privacy$|privacy/` to the matcher exclusions.
- Edited: `app/(auth)/login/page.tsx` — add a small "Privacy" link beneath `<SignInButton />`.

No new dependencies. No new lib utilities. No API routes.

## Testing

Manual verification:

- Open `/privacy` in an incognito window (no session). Page renders, no redirect to `/login`.
- Open `/privacy` while signed in. Page renders identically.
- From `/login`, click the "Privacy" link. Lands on `/privacy`.
- Anchor links in the table of contents jump to the correct sections.
- Build passes (`npm run build`); lint passes (`npm run lint`).

No automated tests; the page is static prose with no logic.

## Risks & Open Questions

- **Hosting / DB provider naming:** the policy lists "MongoDB Atlas (or the hosting provider used for the MongoDB instance)" generically. If a specific provider is in use and Google verification reviewers want it named, that line can be tightened during implementation.
- **DPA / sub-processor list:** not included. If verification reviewers request one, it can be added as a follow-up section.
- **The page does not currently include a postal address.** Google's verification has accepted email-only contact for individual operators in many cases, but reviewers occasionally request an address. If pushed back on, add a contact address line.
