'use client';

import { useMemo, useRef, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FIELD_LABELS } from '@/lib/constants';
import { parseLinkField } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { TourProduct } from '@/lib/types';

interface ShareableProductTableProps {
  products: TourProduct[];
  columns: string[];
}

function buildColumns(fieldIds: string[]): ColumnDef<TourProduct>[] {
  return fieldIds.map((fieldId) => ({
    id: fieldId,
    accessorKey: fieldId,
    header: FIELD_LABELS[fieldId as keyof typeof FIELD_LABELS] ?? fieldId,
    cell: ({ row }: { row: { original: TourProduct } }) => {
      const value = row.original[fieldId as keyof TourProduct];
      if (value === null || value === undefined || value === '') {
        return <span className="text-[hsl(var(--text-tertiary))]">–</span>;
      }
      if (typeof value === 'boolean') {
        return <span>{value ? 'Yes' : 'No'}</span>;
      }
      if (fieldId === 'link' || fieldId === 'productLink' || fieldId === 'providerUrl') {
        const str = String(value);
        const parsed = parseLinkField(str);
        if (parsed.url) {
          return (
            <a
              href={parsed.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[hsl(var(--primary))] underline underline-offset-2 hover:opacity-80"
            >
              {parsed.text || parsed.url}
            </a>
          );
        }
      }
      return <span className="whitespace-nowrap">{String(value)}</span>;
    },
  }));
}

export function ShareableProductTable({ products, columns }: ShareableProductTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);

  const columnDefs = useMemo(() => buildColumns(columns), [columns]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter((p) =>
      columns.some((col) => {
        const val = p[col as keyof TourProduct];
        return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
      })
    );
  }, [products, search, columns]);

  const table = useReactTable({
    data: filteredProducts,
    columns: columnDefs,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0
    ? totalSize - virtualItems[virtualItems.length - 1].end
    : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--text-tertiary))]" />
        <Input
          className="w-full max-w-sm pl-8 pr-8"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))]"
            onClick={() => setSearch('')}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="text-sm text-[hsl(var(--text-tertiary))]">
        {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
      </p>
      <div
        ref={parentRef}
        className="overflow-auto rounded-md border border-[hsl(var(--border))]"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[hsl(var(--surface))]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className="border-b border-[hsl(var(--border))] px-3 py-2 text-left text-xs font-medium text-[hsl(var(--text-secondary))] whitespace-nowrap cursor-pointer select-none hover:bg-[hsl(var(--surface-hover))]"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <span className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === 'asc' ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : sorted === 'desc' ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {paddingTop > 0 && <tr><td style={{ height: paddingTop }} /></tr>}
            {virtualItems.map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-[hsl(var(--border))] last:border-0',
                    virtualRow.index % 2 === 0 ? 'bg-background' : 'bg-[hsl(var(--surface))]'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 text-sm whitespace-nowrap max-w-[300px] truncate">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
            {paddingBottom > 0 && <tr><td style={{ height: paddingBottom }} /></tr>}
          </tbody>
        </table>
        {filteredProducts.length === 0 && (
          <div className="flex items-center justify-center py-16 text-sm text-[hsl(var(--text-tertiary))]">
            No products found
          </div>
        )}
      </div>
    </div>
  );
}
