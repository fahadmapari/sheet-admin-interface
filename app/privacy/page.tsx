import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Sheet Admin",
  description:
    "Privacy policy for Sheet Admin, including disclosures required by Google OAuth verification for the drive.file and spreadsheets scopes.",
};

const LAST_UPDATED = "April 30, 2026";

const sections = [
  { id: "who-we-are", title: "1. Who we are" },
  { id: "who-can-use", title: "2. Who can use this app" },
  { id: "google-data", title: "3. Information we access via your Google Account" },
  { id: "limited-use", title: "4. Limited Use disclosure" },
  { id: "what-we-store", title: "5. Information we store" },
  { id: "cookies", title: "6. Cookies & local storage" },
  { id: "third-parties", title: "7. Third parties" },
  { id: "retention", title: "8. Retention & deletion" },
  { id: "your-rights", title: "9. Your rights" },
  { id: "changes", title: "10. Changes to this policy" },
  { id: "contact", title: "11. Contact" },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="h-screen overflow-y-auto bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
        <header className="mb-10 border-b border-border pb-8">
          <p className="text-sm font-medium text-muted-foreground">Sheet Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Last updated: {LAST_UPDATED}
          </p>
        </header>

        <nav aria-label="Table of contents" className="mb-12">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Contents
          </h2>
          <ul className="space-y-1 text-sm">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <article className="space-y-10 text-sm leading-relaxed text-foreground">
          <section id="who-we-are" className="scroll-mt-8">
            <h2 className="mb-3 text-lg font-semibold">1. Who we are</h2>
            <p>
              Sheet Admin is operated by Fahad Mapari, an individual based in
              India. For privacy questions, contact{" "}
              <a
                href="mailto:btechy4@gmail.com"
                className="font-medium underline underline-offset-4"
              >
                btechy4@gmail.com
              </a>
              .
            </p>
          </section>

          <section id="who-can-use" className="scroll-mt-8">
            <h2 className="mb-3 text-lg font-semibold">2. Who can use this app</h2>
            <p>
              Sheet Admin is a closed, internal tool. Access is restricted to a
              manually maintained allowlist of email addresses. It is not a
              public service and does not accept self-service signups. If your
              email is not on the allowlist, you cannot sign in, and we do not
              create an account or store any data about you.
            </p>
          </section>

          <section id="google-data" className="scroll-mt-8">
            <h2 className="mb-3 text-lg font-semibold">
              3. Information we access via your Google Account
            </h2>
            <p className="mb-4">
              When you sign in, you grant Sheet Admin a limited set of OAuth
              scopes. Each scope is requested only for the user-facing feature
              described below. You can review and revoke these permissions at
              any time at{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noreferrer"
                className="font-medium underline underline-offset-4"
              >
                myaccount.google.com/permissions
              </a>
              .
            </p>
            <ul className="space-y-3">
              <li>
                <strong className="font-medium">openid, email, profile</strong>{" "}
                — used to identify you, display your name and avatar in the
                app, and check your email address against our access
                allowlist.
              </li>
              <li>
                <strong className="font-medium">
                  https://www.googleapis.com/auth/spreadsheets
                </strong>{" "}
                — used to read and write the single configured Google Sheet
                you have been separately granted access to. We do not
                enumerate, list, or access any other spreadsheets in your
                Drive.
              </li>
              <li>
                <strong className="font-medium">
                  https://www.googleapis.com/auth/drive.file
                </strong>{" "}
                — used only when you click &ldquo;Export to Google
                Sheets&rdquo;. A new spreadsheet is created in your own Drive,
                and we retain access only to that file. We cannot list, read,
                or modify any other files in your Drive.
              </li>
            </ul>
          </section>

          <section id="limited-use" className="scroll-mt-8">
            <h2 className="mb-3 text-lg font-semibold">
              4. Limited Use disclosure
            </h2>
            <p className="mb-4">
              Sheet Admin&rsquo;s use and transfer of information received
              from Google APIs to any other app will adhere to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="font-medium underline underline-offset-4"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
            <p>In plain language, this means we do not:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>use Google user data for advertising;</li>
              <li>sell Google user data;</li>
              <li>
                transfer Google user data to third parties except as needed
                to provide or improve the user-facing features, comply with
                applicable law, or as part of a merger, acquisition, or sale
                of assets with notice to users;
              </li>
              <li>
                allow humans to read Google user data, except with your
                consent for specific support cases, for security/abuse
                investigations, or where required by law;
              </li>
              <li>
                use Google user data to develop, improve, or train
                generalized AI or machine-learning models.
              </li>
            </ul>
          </section>

          <section id="what-we-store" className="scroll-mt-8">
            <h2 className="mb-3 text-lg font-semibold">
              5. Information we store
            </h2>
            <p className="mb-3">
              We store the minimum information needed to operate the app, in
              a MongoDB database. Specifically:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <span className="font-medium">accesscontrol</span> — the list
                of allowed email addresses and admin emails.
              </li>
              <li>
                <span className="font-medium">
                  assemblybatches, stageconfig
                </span>{" "}
                — assembly workflow state you create in the app.
              </li>
              <li>
                <span className="font-medium">
                  notifications, notificationsubscriptions
                </span>{" "}
                — in-app notifications and your subscription preferences.
              </li>
              <li>
                Column group and column mapping configuration documents.
              </li>
            </ul>
            <p className="mt-3">
              We do not cache or mirror your Google Sheet rows in our own
              database. Sheet content is read on demand for each request and
              written straight back to Google Sheets. Your OAuth refresh and
              access tokens are stored in the encrypted NextAuth session
              cookie on your device, not in our database.
            </p>
          </section>

          <section id="cookies" className="scroll-mt-8">
            <h2 className="mb-3 text-lg font-semibold">
              6. Cookies & local storage
            </h2>
            <p>
              We set one session cookie (managed by NextAuth) used solely to
              keep you signed in. We do not use advertising or analytics
              cookies. Minor UI preferences such as sidebar collapse state
              and column views may be stored in your browser&rsquo;s
              <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">
                localStorage
              </code>
              ; these never leave your device.
            </p>
          </section>

          <section id="third-parties" className="scroll-mt-8">
            <h2 className="mb-3 text-lg font-semibold">7. Third parties</h2>
            <p className="mb-3">
              Sheet Admin relies on the following third-party services to
              operate:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <span className="font-medium">Google</span> — authentication,
                Google Sheets, and Google Drive APIs.
              </li>
              <li>
                <span className="font-medium">MongoDB Atlas</span> (or the
                hosting provider used for our MongoDB instance) — database
                hosting.
              </li>
              <li>
                The hosting platform that serves the Next.js application.
              </li>
            </ul>
            <p className="mt-3">
              We do not use analytics, advertising, marketing, or third-party
              tracking vendors.
            </p>
          </section>

          <section id="retention" className="scroll-mt-8">
            <h2 className="mb-3 text-lg font-semibold">
              8. Retention & deletion
            </h2>
            <p>
              Data tied to your account is retained for as long as your email
              remains on the allowlist. When your email is removed from the
              allowlist, you lose access to the app within a few minutes
              (sessions are re-checked on a short interval). Data you
              authored, such as assembly batches and notifications, may
              remain in our database for ongoing business use unless you
              request deletion.
            </p>
            <p className="mt-3">
              To request deletion of data tied to your account, email{" "}
              <a
                href="mailto:btechy4@gmail.com"
                className="font-medium underline underline-offset-4"
              >
                btechy4@gmail.com
              </a>
              .
            </p>
          </section>

          <section id="your-rights" className="scroll-mt-8">
            <h2 className="mb-3 text-lg font-semibold">9. Your rights</h2>
            <p>
              You may request access, correction, or deletion of data tied to
              your account by emailing{" "}
              <a
                href="mailto:btechy4@gmail.com"
                className="font-medium underline underline-offset-4"
              >
                btechy4@gmail.com
              </a>
              . You can revoke Google access at any time at{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noreferrer"
                className="font-medium underline underline-offset-4"
              >
                myaccount.google.com/permissions
              </a>
              ; doing so immediately invalidates our OAuth tokens.
            </p>
          </section>

          <section id="changes" className="scroll-mt-8">
            <h2 className="mb-3 text-lg font-semibold">
              10. Changes to this policy
            </h2>
            <p>
              We may update this policy from time to time. Material changes
              are reflected in the &ldquo;Last updated&rdquo; date at the top
              of this page. For significant changes, we may also notify
              users in the app.
            </p>
          </section>

          <section id="contact" className="scroll-mt-8">
            <h2 className="mb-3 text-lg font-semibold">11. Contact</h2>
            <p>
              For privacy questions or requests, contact{" "}
              <a
                href="mailto:btechy4@gmail.com"
                className="font-medium underline underline-offset-4"
              >
                btechy4@gmail.com
              </a>
              .
            </p>
          </section>
        </article>

        <footer className="mt-16 border-t border-border pt-6 text-sm text-muted-foreground">
          <Link
            href="/login"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Back to sign in
          </Link>
        </footer>
      </div>
    </div>
  );
}
