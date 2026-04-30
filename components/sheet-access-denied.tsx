import { ShieldAlert } from 'lucide-react';

export function SheetAccessDenied({
  title = 'No access to the spreadsheet',
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--surface))] text-[hsl(var(--text-secondary))]">
        <ShieldAlert className="h-5 w-5" />
      </div>
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <p className="max-w-md text-sm text-[hsl(var(--text-secondary))]">
        {description ??
          'Your Google account does not have access to the configured spreadsheet. Please ask an administrator to grant you access from Settings → Access.'}
      </p>
    </div>
  );
}
