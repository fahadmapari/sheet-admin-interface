'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { VisibilityState } from '@tanstack/react-table';
import { COLUMN_GROUPS, FIELD_LABELS } from '@/lib/constants';
import type { TourProduct } from '@/lib/types';

interface ExportButtonProps {
  products: TourProduct[];
  columnVisibility: VisibilityState;
}

function getVisibleFields(columnVisibility: VisibilityState): Array<keyof Omit<TourProduct, 'rowIndex'>> {
  const allFields = COLUMN_GROUPS.flatMap((g) => g.fields as unknown as Array<keyof Omit<TourProduct, 'rowIndex'>>);
  return allFields.filter((f) => columnVisibility[f] !== false);
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
  const XLSX = await import('xlsx');
  const headers = visibleFields.map((f) => FIELD_LABELS[f] ?? f);
  const rows = products.map((p) =>
    visibleFields.map((f) => {
      const val = p[f];
      if (val === null || val === undefined) return '';
      if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
      return val;
    })
  );
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  XLSX.writeFile(wb, `products-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function ExportButton({ products, columnVisibility }: ExportButtonProps) {
  const visibleFields = getVisibleFields(columnVisibility);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportCsv(products, visibleFields)}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportXlsx(products, visibleFields)}>
          Export as XLSX
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
