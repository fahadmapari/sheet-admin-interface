'use client';

import { useMemo, useRef, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  functionalUpdate,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronUp, ChevronDown, ChevronsUpDown, MoreHorizontal, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProductStatusClasses } from '@/lib/design-system';
import type { TourProduct } from '@/lib/types';
import { getActiveOtaCount } from './product-detail-sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const OTA_TOTAL = 13;

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-[hsl(var(--text-tertiary))]">—</span>;
  return <Badge className={cn('text-xs', getProductStatusClasses(status))}>{status}</Badge>;
}

function buildColumns(
  onDeleteRequest: (product: TourProduct) => void,
  onEditRequest: (product: TourProduct) => void,
): ColumnDef<TourProduct>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 transition-opacity group-hover/row:opacity-100 data-[state=checked]:opacity-100"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'product',
      accessorKey: 'productName',
      header: 'Product',
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="min-w-0 max-w-[280px]">
            <div className="truncate text-sm font-medium leading-tight text-[hsl(var(--text-primary))]">
              {p.productName || p.link || `${p.city}, ${p.country}`}
            </div>
            {p.duration && (
              <div className="mt-0.5 text-xs text-[hsl(var(--text-secondary))]">{p.duration}</div>
            )}
          </div>
        );
      },
    },
    {
      id: 'location',
      accessorKey: 'city',
      header: 'Location',
      cell: ({ row }) => (
        <div>
          <div className="text-sm font-medium text-[hsl(var(--text-primary))]">{row.original.city}</div>
          <div className="text-xs text-[hsl(var(--text-secondary))]">{row.original.country}</div>
        </div>
      ),
    },
    {
      id: 'type',
      accessorKey: 'productType',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="default" className="text-xs">
          {row.original.productType}
        </Badge>
      ),
    },
    {
      id: 'b2b',
      accessorKey: 'b2bPriceInstant',
      header: 'B2B',
      cell: ({ row }) => (
        <span className="font-medium tabular-nums text-[hsl(var(--text-primary))]">
          {row.original.b2bPriceInstant || '—'}
        </span>
      ),
    },
    {
      id: 'b2c',
      accessorKey: 'b2cPriceInstant',
      header: 'B2C',
      cell: ({ row }) => (
        <span className="font-medium tabular-nums text-[hsl(var(--text-primary))]">
          {row.original.b2cPriceInstant || '—'}
        </span>
      ),
    },
    {
      id: 'pic',
      accessorKey: 'pic',
      header: 'PIC',
      cell: ({ row }) =>
        row.original.pic ? (
          <Badge variant="outline" className="text-xs">
            {row.original.pic}
          </Badge>
        ) : (
          <span className="text-[hsl(var(--text-tertiary))]">—</span>
        ),
    },
    {
      id: 'otas',
      header: 'OTAs',
      accessorFn: (row) => getActiveOtaCount(row),
      cell: ({ row }) => {
        const count = getActiveOtaCount(row.original);
        if (count === 0) return <span className="text-[hsl(var(--text-tertiary))]">—</span>;
        return (
          <Badge variant="outline" className="gap-1 text-xs">
            <Globe className="h-3 w-3 mr-1" />
            {count}/{OTA_TOTAL}
          </Badge>
        );
      },
    },
    {
      id: 'status',
      accessorKey: 'productStatus',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.productStatus} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <RowActionsMenu
          product={row.original}
          onDeleteRequest={onDeleteRequest}
          onEditRequest={onEditRequest}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

function RowActionsMenu({
  product,
  onDeleteRequest,
  onEditRequest,
}: {
  product: TourProduct;
  onDeleteRequest: (product: TourProduct) => void;
  onEditRequest: (product: TourProduct) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 transition-opacity group-hover/row:opacity-100"
          onClick={(e) => e.stopPropagation()}
          aria-label="Row actions"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEditRequest(product)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-red-700 focus:text-red-700 dark:text-red-300 dark:focus:text-red-300"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteRequest(product);
          }}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SkeletonTable() {
  return (
    <div className="animate-pulse space-y-1">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex gap-3 px-4 py-3">
          <div className="h-4 w-4 rounded bg-[hsl(var(--surface-raised))]" />
          <div className="h-4 w-48 rounded bg-[hsl(var(--surface-raised))]" />
          <div className="h-4 w-28 rounded bg-[hsl(var(--surface-raised))]" />
          <div className="h-4 w-20 rounded bg-[hsl(var(--surface-raised))]" />
          <div className="h-4 w-16 rounded bg-[hsl(var(--surface-raised))]" />
          <div className="h-4 w-16 rounded bg-[hsl(var(--surface-raised))]" />
          <div className="h-4 w-12 rounded bg-[hsl(var(--surface-raised))]" />
          <div className="h-4 w-16 rounded bg-[hsl(var(--surface-raised))]" />
          <div className="h-4 w-20 rounded bg-[hsl(var(--surface-raised))]" />
        </div>
      ))}
    </div>
  );
}

interface ProductTableProps {
  data: TourProduct[];
  isLoading: boolean;
  error: unknown;
  rowSelection: RowSelectionState;
  onRowSelectionChange: (updater: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)) => void;
  onDeleteRequest: (product: TourProduct) => void;
  onEditRequest: (product: TourProduct) => void;
  onRowClick: (product: TourProduct) => void;
}

export function ProductTable({
  data,
  isLoading,
  error,
  rowSelection,
  onRowSelectionChange,
  onDeleteRequest,
  onEditRequest,
  onRowClick,
}: ProductTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const columns = useMemo(
    () => buildColumns(onDeleteRequest, onEditRequest),
    [onDeleteRequest, onEditRequest],
  );

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: (updater) => {
      onRowSelectionChange(functionalUpdate(updater, rowSelection));
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    enableMultiSort: false,
  });

  const rows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 49,
    overscan: 10,
  });

  if (isLoading) return <SkeletonTable />;

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center space-y-2">
          <p className="font-medium text-red-700 dark:text-red-300">Failed to load products</p>
          <p className="text-sm text-[hsl(var(--text-secondary))]">{String(error)}</p>
        </div>
      </div>
    );
  }

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
  const paddingBottom = virtualRows.length > 0
    ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0)
    : 0;

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 flex-1 overflow-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]"
    >
      <table className="w-full border-collapse text-sm table-auto">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
            {table.getFlatHeaders().map((header) => (
              <th
                key={header.id}
                className={cn(
                  'px-3 py-3 text-left text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--text-secondary))] whitespace-nowrap',
                  header.column.getCanSort() && 'cursor-pointer select-none transition-colors hover:text-[hsl(var(--text-primary))]',
                  header.id === 'select' && 'w-10',
                  header.id === 'actions' && 'w-10',
                )}
                onClick={header.column.getToggleSortingHandler()}
              >
                <span className="flex items-center gap-1">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getCanSort() && (
                    <>
                      {header.column.getIsSorted() === 'asc' && <ChevronUp className="h-3 w-3" />}
                      {header.column.getIsSorted() === 'desc' && <ChevronDown className="h-3 w-3" />}
                      {!header.column.getIsSorted() && <ChevronsUpDown className="h-3 w-3 opacity-30" />}
                    </>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-16 text-center text-sm text-[hsl(var(--text-secondary))]">
                No products match your filters.
              </td>
            </tr>
          ) : (
            <>
              {paddingTop > 0 && (
                <tr>
                  <td style={{ height: `${paddingTop}px` }} colSpan={columns.length} />
                </tr>
              )}
              {virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <tr
                    key={row.id}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    className={cn(
                      'group/row border-b last:border-b-0 cursor-pointer transition-colors',
                      'border-[hsl(var(--border))] hover:bg-[hsl(var(--surface))]',
                      row.getIsSelected() && 'bg-[hsl(var(--surface))]',
                    )}
                    onClick={() => onRowClick(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="h-11 px-3 text-sm"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {paddingBottom > 0 && (
                <tr>
                  <td style={{ height: `${paddingBottom}px` }} colSpan={columns.length} />
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
