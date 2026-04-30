'use client';

import { useState } from 'react';
import { Download, Link } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { VisibilityState } from '@tanstack/react-table';
import { FIELD_LABELS } from '@/lib/constants';
import { useColumnGroups } from '@/lib/hooks/use-column-groups';
import type { ColumnGroup } from '@/lib/column-groups';
import type { TourProduct } from '@/lib/types';
import type { Filters } from '@/lib/product-filters';
import { CreateShareableLinkDialog } from '@/components/products/create-shareable-link-dialog';

interface ExportButtonProps {
  products: TourProduct[];
  columnVisibility: VisibilityState;
  filters: Filters;
}

// Maps composite TanStack column IDs to their underlying raw field IDs
const COMPOSITE_TO_FIELDS: Record<string, Array<keyof Omit<TourProduct, 'rowIndex'>>> = {
  product: ['productName', 'duration'],
  location: ['city', 'country'],
  type: ['productType'],
  status: ['productStatus'],
};

function getVisibleFields(
  columnVisibility: VisibilityState,
  groups: ColumnGroup[]
): Array<keyof Omit<TourProduct, 'rowIndex'>> {
  const allFields = groups.flatMap((g) => g.fields as unknown as Array<keyof Omit<TourProduct, 'rowIndex'>>);

  // Collect raw fields contributed by visible composite columns
  const fromComposite = new Set<string>();
  for (const [compositeId, fields] of Object.entries(COMPOSITE_TO_FIELDS)) {
    if (columnVisibility[compositeId] === true) {
      for (const f of fields) fromComposite.add(f);
    }
  }

  return allFields.filter((f) => columnVisibility[f] !== false || fromComposite.has(f));
}

function getCellValue(product: TourProduct, field: keyof Omit<TourProduct, 'rowIndex'>): string {
  const val = product[field];
  if (val === null || val === undefined) return '';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  return String(val);
}

function exportCsv(products: TourProduct[], visibleFields: Array<keyof Omit<TourProduct, 'rowIndex'>>) {
  const headers = visibleFields.map((f) => FIELD_LABELS[f] ?? f);
  const rows = products.map((p) =>
    visibleFields.map((f) => {
      const str = getCellValue(p, f);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
  );
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportXlsx(products: TourProduct[], visibleFields: Array<keyof Omit<TourProduct, 'rowIndex'>>) {
  const ExcelJS = (await import('exceljs')).default;
  const headers = visibleFields.map((f) => FIELD_LABELS[f] ?? f);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Products');
  worksheet.addRow(headers);
  for (const p of products) {
    worksheet.addRow(
      visibleFields.map((f) => {
        const val = p[f];
        if (val === null || val === undefined) return '';
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        return val;
      }),
    );
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `products-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportButton({ products, columnVisibility, filters }: ExportButtonProps) {
  const { groups } = useColumnGroups();
  const visibleFields = getVisibleFields(columnVisibility, groups);

  const [exportingToSheets, setExportingToSheets] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  async function exportToGoogleSheets() {
    setExportingToSheets(true);
    const toastId = toast.loading('Creating Google Sheet…');
    try {
      const fields = visibleFields.map((f) => FIELD_LABELS[f] ?? f);
      const rows = products.map((p) =>
        visibleFields.map((f) => getCellValue(p, f)),
      );
      const title = `Products export ${new Date().toISOString().slice(0, 10)}`;

      const res = await fetch('/api/export/google-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, fields, rows }),
      });

      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? 'Export failed');
      }
      toast.success('Google Sheet ready', {
        id: toastId,
        duration: 10000,
        action: {
          label: 'Open',
          onClick: () => window.open(data.url!, '_blank'),
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export to Google Sheets failed', {
        id: toastId,
        duration: 8000,
      });
    } finally {
      setExportingToSheets(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="mr-1 h-4 w-4" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => { exportCsv(products, visibleFields); toast.success(`Exported ${products.length} rows as CSV`); }}>
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={async () => { await exportXlsx(products, visibleFields); toast.success(`Exported ${products.length} rows as XLSX`); }}>
            Export as XLSX
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={exportToGoogleSheets}
            disabled={exportingToSheets}
          >
            Export to Google Sheets
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShareDialogOpen(true)}>
            <Link className="mr-2 h-4 w-4" />
            Create Shareable Link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateShareableLinkDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        columnVisibility={columnVisibility}
        filters={filters}
        productCount={products.length}
      />
    </>
  );
}
