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
