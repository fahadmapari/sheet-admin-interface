'use client';

import { useMemo, useState } from 'react';
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
import { ChevronUp, ChevronDown, ChevronsUpDown, MoreHorizontal, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { STATUS_COLORS } from '@/lib/constants';
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
  if (!status) return <span className="text-muted-foreground">—</span>;
  const colors = STATUS_COLORS[status];
  if (!colors) return <Badge variant="outline" className="text-xs">{status}</Badge>;
  return <Badge className={`${colors.bg} ${colors.text} border-0 text-xs`}>{status}</Badge>;
}

function buildColumns(
  onDeleteRequest: (product: TourProduct) => void,
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
            <div className="font-medium text-foreground leading-tight truncate">
              {p.productName || p.link || `${p.city}, ${p.country}`}
            </div>
            {p.duration && (
              <div className="text-muted-foreground text-xs mt-0.5">{p.duration}</div>
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
          <div className="font-medium">{row.original.city}</div>
          <div className="text-muted-foreground text-xs">{row.original.country}</div>
        </div>
      ),
    },
    {
      id: 'type',
      accessorKey: 'productType',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-xs font-medium">
          {row.original.productType}
        </Badge>
      ),
    },
    {
      id: 'b2b',
      accessorKey: 'b2bPriceInstant',
      header: 'B2B',
      cell: ({ row }) => (
        <span className="font-semibold tabular-nums">
          {row.original.b2bPriceInstant || '—'}
        </span>
      ),
    },
    {
      id: 'b2c',
      accessorKey: 'b2cPriceInstant',
      header: 'B2C',
      cell: ({ row }) => (
        <span className="font-semibold tabular-nums text-emerald-700">
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
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
            {row.original.pic}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'otas',
      header: 'OTAs',
      accessorFn: (row) => getActiveOtaCount(row),
      cell: ({ row }) => {
        const count = getActiveOtaCount(row.original);
        if (count === 0) return <span className="text-muted-foreground">—</span>;
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
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
      cell: ({ row }) => <RowActionsMenu product={row.original} onDeleteRequest={onDeleteRequest} />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

function RowActionsMenu({
  product,
  onDeleteRequest,
}: {
  product: TourProduct;
  onDeleteRequest: (product: TourProduct) => void;
}) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover/row:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
          aria-label="Row actions"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/products/${product.rowIndex}`)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
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
          <div className="h-4 w-4 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded" />
          <div className="h-4 w-28 bg-muted rounded" />
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="h-4 w-12 bg-muted rounded" />
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="h-4 w-20 bg-muted rounded" />
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
  onRowClick: (product: TourProduct) => void;
}

export function ProductTable({
  data,
  isLoading,
  error,
  rowSelection,
  onRowSelectionChange,
  onDeleteRequest,
  onRowClick,
}: ProductTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(() => buildColumns(onDeleteRequest), [onDeleteRequest]);

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

  if (isLoading) return <SkeletonTable />;

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">Failed to load products</p>
          <p className="text-muted-foreground text-sm">{String(error)}</p>
        </div>
      </div>
    );
  }

  const rows = table.getRowModel().rows;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <table className="w-full border-collapse text-sm table-auto">
        <thead>
          <tr className="border-b bg-muted/50">
            {table.getFlatHeaders().map((header) => (
              <th
                key={header.id}
                className={cn(
                  'px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap',
                  header.column.getCanSort() && 'cursor-pointer select-none hover:text-foreground transition-colors',
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
              <td colSpan={columns.length} className="text-center py-16 text-muted-foreground text-sm">
                No products match your filters.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  'group/row border-b last:border-b-0 cursor-pointer transition-colors',
                  'hover:bg-accent/40',
                  row.getIsSelected() && 'bg-accent/20',
                )}
                onClick={() => onRowClick(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-3 py-3"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
