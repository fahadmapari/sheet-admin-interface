// components/written-products/written-product-table.tsx
'use client';

import { useRef, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type Row,
  type VisibilityState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ExternalLink } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { WrittenProduct } from '@/lib/types';
import { parseLinkField } from '@/lib/utils';

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

interface WrittenProductTableProps {
  products: WrittenProduct[];
  onEdit: (product: WrittenProduct) => void;
  columnVisibility?: VisibilityState;
}

export function WrittenProductTable({ products, onEdit, columnVisibility = {} }: WrittenProductTableProps) {
  const columns = useMemo<ColumnDef<WrittenProduct>[]>(() => [
    {
      id: 'textLink',
      accessorKey: 'textLink',
      header: 'Link / Title',
      cell: ({ row }) => {
        const raw = row.original.textLink;
        if (!raw) return <span className="text-[hsl(var(--text-tertiary))]">—</span>;
        const { text, url } = parseLinkField(raw);
        const displayName = text || url || raw;
        return (
          <div className="min-w-0 max-w-[280px] flex items-start gap-1">
            <span className="font-medium text-sm break-words whitespace-normal">{displayName}</span>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5 flex-shrink-0 text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))] transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        );
      },
    },
    {
      id: 'location',
      header: 'Location',
      cell: ({ row }) => {
        const city = row.original.cityDestination;
        const country = row.original.country;
        if (!city && !country) return <span className="text-[hsl(var(--text-tertiary))]">—</span>;
        return (
          <div className="flex flex-col leading-tight">
            {city && <span className="text-sm">{city}</span>}
            {country && <span className="text-xs text-[hsl(var(--text-tertiary))]">{country}</span>}
          </div>
        );
      },
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
        <Checkbox checked={row.original[field] as boolean} disabled />
      ),
    })),
  ], [onEdit]);

  const table = useReactTable({
    data: products,
    columns,
    state: { columnVisibility },
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.rowIndex),
  });

  const rows = table.getRowModel().rows;

  const containerRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 41,
    overscan: 10,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0;

  return (
    <div
      ref={containerRef}
      className="flex items-start min-h-0 flex-1 overflow-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]"
    >
      <table className="w-full min-w-[640px] text-sm border-collapse table-auto">
        <thead className="sticky top-0 z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-3 text-left text-xs font-medium text-[hsl(var(--text-secondary))] uppercase tracking-[0.08em] whitespace-nowrap"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={table.getVisibleLeafColumns().length}
                className="py-16 text-center text-[hsl(var(--text-secondary))] text-sm"
              >
                No written products found.
              </td>
            </tr>
          ) : (
            <>
              {paddingTop > 0 && (
                <tr>
                  <td style={{ height: `${paddingTop}px` }} colSpan={table.getVisibleLeafColumns().length} />
                </tr>
              )}
              {virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <tr
                    key={row.id}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    className="group/row border-b last:border-b-0 border-[hsl(var(--border))] hover:bg-[hsl(var(--surface))] transition-colors cursor-pointer"
                    onClick={() => onEdit(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className={`h-11 px-3 text-sm ${cell.column.id === 'textLink' ? 'whitespace-normal' : 'whitespace-nowrap'}`}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {paddingBottom > 0 && (
                <tr>
                  <td style={{ height: `${paddingBottom}px` }} colSpan={table.getVisibleLeafColumns().length} />
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
