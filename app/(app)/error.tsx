'use client';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-6 text-center">
      <h2 className="text-xl font-semibold tracking-tight">Something went wrong</h2>
      <p className="text-sm text-[hsl(var(--text-secondary))]">{error.message}</p>
      <Button onClick={reset} variant="secondary">
        Try again
      </Button>
    </div>
  );
}
