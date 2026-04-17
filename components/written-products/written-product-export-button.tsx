// components/written-products/written-product-export-button.tsx
'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WrittenProduct } from '@/lib/types';

type Field = keyof Omit<WrittenProduct, 'rowIndex'>;

const ALL_FIELDS: Field[] = [
  'textLink', 'country', 'cityDestination', 'state', 'tourType',
  'ccOk', 'isOk', 'rrOk', 'ssOk', 'contentExist', 'b2b', 'b2c', 'ssNotes',
];

const LABELS: Record<Field, string> = {
  textLink: 'Text Link',
  country: 'Country',
  cityDestination: 'City / Destination',
  state: 'State',
  tourType: 'Tour Type',
  ccOk: 'CC OK',
  isOk: 'IS OK',
  rrOk: 'RR OK',
  ssOk: 'SS OK',
  contentExist: 'Content Exist',
  b2b: 'B2B',
  b2c: 'B2C',
  ssNotes: 'SS Notes',
};

function getCellValue(product: WrittenProduct, field: Field): string {
  const v = product[field];
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return v ?? '';
}

interface WrittenProductExportButtonProps {
  products: WrittenProduct[];
}

export function WrittenProductExportButton({ products }: WrittenProductExportButtonProps) {
  const [exportingToSheets, setExportingToSheets] = useState(false);

  async function exportToGoogleSheets() {
    setExportingToSheets(true);
    const toastId = toast.loading('Creating Google Sheet…');
    try {
      const fields = ALL_FIELDS.map((f) => LABELS[f]);
      const rows = products.map((p) => ALL_FIELDS.map((f) => getCellValue(p, f)));
      const title = `Written Products export ${new Date().toISOString().slice(0, 10)}`;
      const res = await fetch('/api/export/google-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, fields, rows }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      toast.success('Sheet created', {
        id: toastId,
        action: { label: 'Open', onClick: () => window.open(url, '_blank') },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed', { id: toastId });
    } finally {
      setExportingToSheets(false);
    }
  }

  function exportCsv() {
    const headers = ALL_FIELDS.map((f) => LABELS[f]);
    const rows = products.map((p) => ALL_FIELDS.map((f) => getCellValue(p, f)));
    const escape = (v: string) => (v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
    const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `written-products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-sm">
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={exportToGoogleSheets} disabled={exportingToSheets}>
          Export to Google Sheets
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={exportCsv}>
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
