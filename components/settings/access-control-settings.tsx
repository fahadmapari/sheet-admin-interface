'use client';

import { useState, useTransition } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { AccessControlDoc } from '@/lib/access-control';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  initialData: AccessControlDoc;
  currentUserEmail: string;
}

export function AccessControlSettings({ initialData, currentUserEmail }: Props) {
  const [data, setData] = useState<AccessControlDoc>(initialData);
  const [allowedInput, setAllowedInput] = useState('');
  const [adminInput, setAdminInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function save(patch: Partial<AccessControlDoc>) {
    const next: AccessControlDoc = {
      allowAll: patch.allowAll ?? data.allowAll,
      allowedEmails: patch.allowedEmails ?? data.allowedEmails,
      adminEmails: patch.adminEmails ?? data.adminEmails,
    };
    const res = await fetch('/api/access-control', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    if (res.ok) {
      const updated: AccessControlDoc = await res.json();
      setData(updated);
      setError(null);
    } else {
      setError('Failed to save. Please try again.');
    }
  }

  function addAllowed() {
    const email = allowedInput.trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email) || data.allowedEmails.includes(email)) return;
    startTransition(async () => {
      await save({ allowedEmails: [...data.allowedEmails, email] });
      setAllowedInput('');
    });
  }

  function removeAllowed(email: string) {
    startTransition(() => save({ allowedEmails: data.allowedEmails.filter((e) => e !== email) }));
  }

  function addAdmin() {
    const email = adminInput.trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email) || data.adminEmails.includes(email)) return;
    startTransition(async () => {
      await save({ adminEmails: [...data.adminEmails, email] });
      setAdminInput('');
    });
  }

  function removeAdmin(email: string) {
    if (email === currentUserEmail) {
      if (!confirm("You'll lose access to this settings tab — are you sure?")) return;
    }
    startTransition(() => save({ adminEmails: data.adminEmails.filter((e) => e !== email) }));
  }

  return (
    <div className="flex flex-col gap-8 max-w-lg">
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {/* Allow All */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Sign-in Access</h2>
        <div className="flex items-center gap-3">
          <Switch
            id="allow-all"
            checked={data.allowAll}
            onCheckedChange={(checked) => startTransition(() => save({ allowAll: checked }))}
            disabled={isPending}
          />
          <Label htmlFor="allow-all">Allow all Google accounts</Label>
        </div>
        {data.allowAll && (
          <p className="text-sm text-amber-600">Warning: any Google account can sign in.</p>
        )}
      </div>

      {/* Allowed Emails */}
      <div className="flex flex-col gap-3">
        <h2 className={`text-sm font-semibold ${data.allowAll ? 'text-muted-foreground' : ''}`}>
          Allowed Emails{data.allowAll ? ' (inactive — Allow All is on)' : ''}
        </h2>
        <div className="flex flex-col gap-1">
          {data.allowedEmails.length === 0 && (
            <p className="text-xs text-muted-foreground">No emails added.</p>
          )}
          {data.allowedEmails.map((email) => (
            <div key={email} className="flex items-center justify-between py-1 px-2 rounded bg-muted text-sm">
              <span>{email}</span>
              <button
                onClick={() => removeAllowed(email)}
                disabled={isPending || data.allowAll}
                className="text-muted-foreground hover:text-destructive disabled:opacity-40 ml-2"
                aria-label={`Remove ${email}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="email@example.com"
            value={allowedInput}
            onChange={(e) => setAllowedInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAllowed()}
            disabled={isPending || data.allowAll}
          />
          <Button variant="outline" onClick={addAllowed} disabled={isPending || data.allowAll}>
            Add
          </Button>
        </div>
      </div>

      {/* Admin Emails */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Admin Emails</h2>
        <p className="text-xs text-muted-foreground">These emails can view and manage this Access tab.</p>
        <div className="flex flex-col gap-1">
          {data.adminEmails.map((email) => (
            <div key={email} className="flex items-center justify-between py-1 px-2 rounded bg-muted text-sm">
              <span>
                {email}
                {email === currentUserEmail && (
                  <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                )}
              </span>
              <button
                onClick={() => removeAdmin(email)}
                disabled={isPending}
                className="text-muted-foreground hover:text-destructive disabled:opacity-40 ml-2"
                aria-label={`Remove ${email}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="email@example.com"
            value={adminInput}
            onChange={(e) => setAdminInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAdmin()}
            disabled={isPending}
          />
          <Button variant="outline" onClick={addAdmin} disabled={isPending}>
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
