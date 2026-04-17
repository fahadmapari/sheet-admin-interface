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
import { Checkbox } from '@/components/ui/checkbox';
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
    <div ref={containerRef} className="h-full overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-10 bg-[hsl(var(--surface))]">
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
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={table.getVisibleLeafColumns().length}
                className="px-3 py-8 text-center text-[hsl(var(--text-tertiary))] text-sm"
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
                    className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--surface))] transition-colors cursor-pointer"
                    onClick={() => onEdit(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2 whitespace-nowrap">
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
