'use client';

import { useState } from 'react';
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
  const [isSaving, setIsSaving] = useState(false);
  const [sharingEmail, setSharingEmail] = useState<string | null>(null);
  const [shareMessages, setShareMessages] = useState<Record<string, { type: 'success' | 'error'; text: string }>>({});
  const [error, setError] = useState<string | null>(null);

  async function save(patch: Partial<AccessControlDoc>) {
    const next: AccessControlDoc = {
      allowAll: patch.allowAll ?? data.allowAll,
      allowedEmails: patch.allowedEmails ?? data.allowedEmails,
      adminEmails: patch.adminEmails ?? data.adminEmails,
    };
    setIsSaving(true);
    try {
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
    } finally {
      setIsSaving(false);
    }
  }

  async function addAllowed() {
    const email = allowedInput.trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email) || data.allowedEmails.includes(email)) return;
    await save({ allowedEmails: [...data.allowedEmails, email] });
    setAllowedInput('');
  }

  function removeAllowed(email: string) {
    save({ allowedEmails: data.allowedEmails.filter((e) => e !== email) });
  }

  async function grantSheetAccess(email: string) {
    setSharingEmail(email);
    setShareMessages((current) => {
      const next = { ...current };
      delete next[email];
      return next;
    });

    try {
      const res = await fetch('/api/access-control/share-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = await res.json() as { status?: string; error?: string };

      if (!res.ok) {
        setShareMessages((current) => ({
          ...current,
          [email]: { type: 'error', text: body.error ?? 'Failed to grant Sheet access.' },
        }));
        return;
      }

      const text = body.status === 'already_has_access'
        ? 'Already has Sheet access.'
        : 'Sheet editor access granted.';
      setShareMessages((current) => ({
        ...current,
        [email]: { type: 'success', text },
      }));
    } finally {
      setSharingEmail(null);
    }
  }

  async function addAdmin() {
    const email = adminInput.trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email) || data.adminEmails.includes(email)) return;
    await save({ adminEmails: [...data.adminEmails, email] });
    setAdminInput('');
  }

  function removeAdmin(email: string) {
    if (email === currentUserEmail) {
      if (!confirm("You'll lose access to this settings tab. Are you sure?")) return;
    }
    save({ adminEmails: data.adminEmails.filter((e) => e !== email) });
  }

  return (
    <div className="flex flex-col gap-8 max-w-lg">
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Sign-in Access</h2>
        <div className="flex items-center gap-3">
          <Switch
            id="allow-all"
            checked={data.allowAll}
            onCheckedChange={(checked) => save({ allowAll: checked })}
            disabled={isSaving}
          />
          <Label htmlFor="allow-all">Allow all Google accounts</Label>
        </div>
        {data.allowAll && (
          <p className="text-sm text-amber-600">Warning: any Google account can sign in.</p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className={`text-sm font-semibold ${data.allowAll ? 'text-muted-foreground' : ''}`}>
          Allowed Emails{data.allowAll ? ' (inactive - Allow All is on)' : ''}
        </h2>
        <p className="text-xs text-muted-foreground">
          App sign-in access and Google Sheet editor access are separate. Grant Sheet access after adding an allowed email.
        </p>
        <div className="flex flex-col gap-1">
          {data.allowedEmails.length === 0 && (
            <p className="text-xs text-muted-foreground">No emails added.</p>
          )}
          {data.allowedEmails.map((email) => (
            <div key={email} className="flex flex-col gap-1 py-2 px-2 rounded bg-muted text-sm">
              <div className="flex items-center justify-between gap-2">
                <span>{email}</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => grantSheetAccess(email)}
                    disabled={isSaving || sharingEmail === email}
                  >
                    {sharingEmail === email ? 'Granting...' : 'Grant Sheet Access'}
                  </Button>
                  <button
                    onClick={() => removeAllowed(email)}
                    disabled={isSaving || data.allowAll}
                    className="text-muted-foreground hover:text-destructive disabled:opacity-40"
                    aria-label={`Remove ${email}`}
                  >
                    x
                  </button>
                </div>
              </div>
              {shareMessages[email] && (
                <p className={`text-xs ${shareMessages[email].type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
                  {shareMessages[email].text}
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="email@example.com"
            value={allowedInput}
            onChange={(e) => setAllowedInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAllowed()}
            disabled={isSaving || data.allowAll}
          />
          <Button variant="outline" onClick={addAllowed} disabled={isSaving || data.allowAll}>
            Add
          </Button>
        </div>
      </div>

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
                disabled={isSaving}
                className="text-muted-foreground hover:text-destructive disabled:opacity-40 ml-2"
                aria-label={`Remove ${email}`}
              >
                x
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
            disabled={isSaving}
          />
          <Button variant="outline" onClick={addAdmin} disabled={isSaving}>
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
