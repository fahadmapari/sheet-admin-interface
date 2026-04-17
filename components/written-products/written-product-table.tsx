// components/written-products/written-product-table.tsx
'use client';

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { WrittenProduct } from '@/lib/types';

const BOOLEAN_FIELDS = [
  'ccOk', 'isOk', 'rrOk', 'ssOk', 'contentExist', 'b2b', 'b2c', 'ssNotes',
] as const;

const BOOLEAN_LABELS: Record<(typeof BOOLEAN_FIELDS)[number], string> = {
  ccOk: 'CC OK',
  isOk: 'IS OK',
  rrOk: 'RR OK',
  ssOk: 'SS OK',
  contentExist: 'Content',
  b2b: 'B2B',
  b2c: 'B2C',
  ssNotes: 'SS Notes',
};

function BooleanBadge({ value }: { value: boolean }) {
  if (value) {
    return (
      <Badge className="bg-green-100 text-green-700 border border-green-200 text-xs px-1.5">
        ✓
      </Badge>
    );
  }
  return <span className="text-[hsl(var(--text-tertiary))]">—</span>;
}

interface WrittenProductTableProps {
  products: WrittenProduct[];
  onEdit: (product: WrittenProduct) => void;
  onDelete: (product: WrittenProduct) => void;
}

export function WrittenProductTable({ products, onEdit, onDelete }: WrittenProductTableProps) {
  const columns: ColumnDef<WrittenProduct>[] = [
    {
      id: 'textLink',
      accessorKey: 'textLink',
      header: 'Text Link',
      cell: ({ row }) => (
        <span className="font-medium text-sm max-w-[300px] truncate block">
          {row.original.textLink || '—'}
        </span>
      ),
    },
    {
      id: 'country',
      accessorKey: 'country',
      header: 'Country',
      cell: ({ row }) => <span className="text-sm">{row.original.country || '—'}</span>,
    },
    {
      id: 'cityDestination',
      accessorKey: 'cityDestination',
      header: 'City / Destination',
      cell: ({ row }) => <span className="text-sm">{row.original.cityDestination || '—'}</span>,
    },
    {
      id: 'state',
      accessorKey: 'state',
      header: 'State',
      cell: ({ row }) => <span className="text-sm">{row.original.state || '—'}</span>,
    },
    {
      id: 'tourType',
      accessorKey: 'tourType',
      header: 'Tour Type',
      cell: ({ row }) => <span className="text-sm">{row.original.tourType || '—'}</span>,
    },
    ...BOOLEAN_FIELDS.map((field) => ({
      id: field,
      accessorKey: field,
      header: BOOLEAN_LABELS[field],
      cell: ({ row }: { row: Row<WrittenProduct> }) => (
        <BooleanBadge value={row.original[field] as boolean} />
      ),
    })),
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1 justify-end">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onEdit(row.original)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(row.original)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.rowIndex),
  });

  return (
    <div className="w-full overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-[hsl(var(--border))]">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2 text-left text-xs font-medium text-[hsl(var(--text-tertiary))] uppercase tracking-wide whitespace-nowrap"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--surface))] transition-colors"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2 whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-8 text-center text-[hsl(var(--text-tertiary))] text-sm"
              >
                No written products found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
