'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLUMN_GROUPS, STATUS_COLORS, FIELD_LABELS } from '@/lib/constants';
import type { TourProduct } from '@/lib/types';

const fetcher = (url: string) =>
  fetch(url).then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json(); });

// Column width map
const COL_WIDTHS: Partial<Record<keyof TourProduct | 'rowNum', number>> = {
  rowNum: 60,
  country: 120,
  city: 120,
  department: 100,
  region: 100,
  productType: 130,
  link: 200,
  duration: 80,
  productStatus: 140,
  productName: 180,
  written: 60,
  notes: 160,
  isOk: 80,
  ssOk: 60,
  imageLinks: 160,
  maxPax: 70,
  guide: 60,
  driver: 60,
  driverGuide: 80,
  guideWhere: 120,
  componentsOfTour: 160,
  attractionIncluded: 60,
  attractionOptional: 60,
  transportation: 120,
  attractionsIncluded: 160,
  attractionLink: 160,
  vatPercent: 70,
  pic: 80,
};

function BooleanCell({ value }: { value: boolean }) {
  return (
    <span className={value ? 'text-green-500' : 'text-gray-300'}>●</span>
  );
}

function StatusCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;
  const colors = STATUS_COLORS[value];
  if (!colors) return <span className="text-xs">{value}</span>;
  return (
    <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium', colors.bg, colors.text)}>
      {value}
    </span>
  );
}

function buildColumns(): ColumnDef<TourProduct>[] {
  const cols: ColumnDef<TourProduct>[] = [
    {
      id: 'rowNum',
      header: '#',
      cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.original.rowIndex}</span>,
      size: COL_WIDTHS.rowNum,
      enableSorting: false,
    },
  ];

  for (const group of COLUMN_GROUPS) {
    for (const field of group.fields) {
      const key = field as keyof Omit<TourProduct, 'rowIndex'>;
      cols.push({
        id: key,
        accessorKey: key,
        header: FIELD_LABELS[key],
        size: COL_WIDTHS[key] ?? 120,
        cell: ({ getValue }) => {
          const val = getValue();
          if (typeof val === 'boolean') return <BooleanCell value={val} />;
          if (key === 'productStatus') return <StatusCell value={val as string | null} />;
          if (val === null || val === undefined || val === '') {
            return <span className="text-muted-foreground text-xs">—</span>;
          }
          return (
            <span className="max-w-[200px] truncate block" title={String(val)}>
              {String(val)}
            </span>
          );
        },
      });
    }
  }

  return cols;
}

function SkeletonTable() {
  return (
    <div className="animate-pulse p-4 space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex gap-2">
          {Array.from({ length: 10 }).map((_, j) => (
            <div key={j} className="h-8 bg-muted rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ProductTable() {
  const { data, error, isLoading } = useSWR<TourProduct[]>('/api/products', fetcher, {
    dedupingInterval: 60_000,
  });

  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = useMemo(() => buildColumns(), []);

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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

  const headerGroups = table.getHeaderGroups();

  return (
    <div className="h-full overflow-auto">
      <table className="border-collapse text-sm">
        <thead className="sticky top-0 z-10">
          {/* Group row */}
          <tr className="bg-muted/80 backdrop-blur">
            {/* rowNum cell spanning the # column */}
            <th
              className="border border-border px-2 py-1.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap sticky left-0 bg-muted/80"
              rowSpan={2}
            >
              #
            </th>
            {COLUMN_GROUPS.map((group) => (
              <th
                key={group.id}
                colSpan={group.fields.length}
                className="border border-border px-2 py-1.5 text-center text-xs font-semibold text-foreground whitespace-nowrap"
              >
                {group.label}
              </th>
            ))}
          </tr>
          {/* Column header row — skip first header (rowNum, already rowSpan=2) */}
          <tr className="bg-muted/60 backdrop-blur">
            {headerGroups[0]?.headers.slice(1).map((header) => (
              <th
                key={header.id}
                className={cn(
                  'border border-border px-2 py-1.5 text-left text-xs font-medium whitespace-nowrap cursor-pointer select-none',
                  'hover:bg-accent/50'
                )}
                style={{ width: header.getSize(), minWidth: header.getSize() }}
                onClick={header.column.getToggleSortingHandler()}
              >
                <span className="flex items-center gap-1">
                  {flexRender(header.column.columnDef.header, header.getContext())}
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
          {table.getRowModel().rows.map((row, rowIdx) => (
            <tr
              key={row.id}
              className={cn(
                'hover:bg-accent/30 transition-colors',
                rowIdx % 2 === 0 ? 'bg-background' : 'bg-muted/20'
              )}
            >
              {row.getVisibleCells().map((cell, cellIdx) => (
                <td
                  key={cell.id}
                  className={cn(
                    'border border-border px-2 py-1 text-xs',
                    cellIdx === 0 && 'sticky left-0 bg-inherit font-mono text-muted-foreground',
                    cellIdx === 1 && 'sticky left-[60px] bg-inherit font-medium',
                    cellIdx === 2 && 'sticky left-[180px] bg-inherit'
                  )}
                  style={{ width: cell.column.getSize(), minWidth: cell.column.getSize() }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
