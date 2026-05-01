'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ComboboxInput } from '@/components/ui/combobox-input';

export function NewCrawlDialog({
  countries,
  cities,
  trigger,
}: {
  countries: string[];
  cities: string[];
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rootUrl, setRootUrl] = useState('');
  const [providerName, setProviderName] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!rootUrl || !providerName || !country || !city) {
      toast.error('All fields are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/sources/crawls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rootUrl,
          providerName,
          defaultCountry: country,
          defaultCity: city,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to start crawl');
      }
      const data = (await res.json()) as { id: string };
      setOpen(false);
      router.push(`/sources/crawls/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start crawl');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Crawl</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="root-url">Root URL</Label>
            <Input
              id="root-url"
              value={rootUrl}
              onChange={(e) => setRootUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="provider">Provider name</Label>
            <Input
              id="provider"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder="Rome Tourist Office"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="country">Default country</Label>
            <ComboboxInput
              id="country"
              value={country}
              onChange={setCountry}
              options={countries}
              placeholder="Italy"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">Default city</Label>
            <ComboboxInput
              id="city"
              value={city}
              onChange={setCity}
              options={cities}
              placeholder="Rome"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Starting...' : 'Start Crawl'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
