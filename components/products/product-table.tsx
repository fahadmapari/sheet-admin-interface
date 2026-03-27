'use client';

import { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import useSWR from 'swr';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  functionalUpdate,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALWAYS_VISIBLE_COLUMNS, COLUMN_GROUPS, STATUS_COLORS, FIELD_LABELS } from '@/lib/constants';
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

interface ProductTableProps {
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => void;
}

export function ProductTable({ columnVisibility, onColumnVisibilityChange }: ProductTableProps) {
  const { data, error, isLoading } = useSWR<TourProduct[]>('/api/products', fetcher, {
    dedupingInterval: 60_000,
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const columns = useMemo(() => buildColumns(), []);

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: (updater) => {
      onColumnVisibilityChange(functionalUpdate(updater, columnVisibility));
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 20,
  });

  const toggleGroup = (groupId: string) => {
    const group = COLUMN_GROUPS.find((g) => g.id === groupId);
    if (!group) return;
    const isCurrentlyCollapsed = !!collapsedGroups[groupId];
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
    onColumnVisibilityChange((prev: VisibilityState) => {
      const next = { ...prev };
      for (const field of group.fields) {
        if (!ALWAYS_VISIBLE_COLUMNS.has(field)) {
          next[field] = isCurrentlyCollapsed; // true = expanding, false = collapsing
        }
      }
      return next;
    });
  };

  // Memoized visible column counts per group
  const groupVisibleCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const group of COLUMN_GROUPS) {
      counts[group.id] = group.fields.filter(
        (f) => table.getColumn(f)?.getIsVisible() !== false
      ).length;
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnVisibility]); // columnVisibility changes when groups collapse

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

  // All visible columns except rowNum (which is in a rowSpan=2 header)
  const visibleDataHeaders = table
    .getAllColumns()
    .filter((col) => col.id !== 'rowNum' && col.getIsVisible());

  return (
    <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
      <table className="border-collapse text-sm">
        <thead className="sticky top-0 z-10">
          {/* Group header row */}
          <tr className="bg-muted/80 backdrop-blur">
            {/* rowNum spanning both header rows */}
            <th
              className="border border-border px-2 py-1.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap sticky left-0 bg-muted/80"
              rowSpan={2}
            >
              #
            </th>
            {COLUMN_GROUPS.map((group) => {
              const visCount = groupVisibleCounts[group.id];
              const isCollapsed = !!collapsedGroups[group.id];
              const colSpan = Math.max(visCount, 1);

              return (
                <th
                  key={group.id}
                  colSpan={colSpan}
                  className="border border-border px-2 py-1.5 text-center text-xs font-bold text-foreground whitespace-nowrap bg-muted cursor-pointer select-none hover:bg-muted/70"
                  onClick={() => toggleGroup(group.id)}
                >
                  <span className="inline-flex items-center gap-1 justify-center">
                    {group.label}
                    <ChevronRight
                      className={cn(
                        'h-3 w-3 transition-transform duration-150',
                        !isCollapsed && 'rotate-90'
                      )}
                    />
                  </span>
                </th>
              );
            })}
          </tr>
          {/* Column header row */}
          <tr className="bg-muted/60 backdrop-blur">
            {visibleDataHeaders.map((col) => {
              // Get size from the column
              const size = col.getSize();
              const header = table.getFlatHeaders().find((h) => h.id === col.id);
              return (
                <th
                  key={col.id}
                  className={cn(
                    'border border-border px-2 py-1.5 text-left text-xs font-medium whitespace-nowrap cursor-pointer select-none',
                    'hover:bg-accent/50'
                  )}
                  style={{ width: size, minWidth: size }}
                  onClick={col.getToggleSortingHandler()}
                >
                  <span className="flex items-center gap-1">
                    {header
                      ? flexRender(col.columnDef.header, header.getContext())
                      : col.id}
                    {col.getCanSort() && (
                      <>
                        {col.getIsSorted() === 'asc' && <ChevronUp className="h-3 w-3" />}
                        {col.getIsSorted() === 'desc' && <ChevronDown className="h-3 w-3" />}
                        {!col.getIsSorted() && <ChevronsUpDown className="h-3 w-3 opacity-30" />}
                      </>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {(() => {
            const virtualItems = rowVirtualizer.getVirtualItems();
            const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
            const paddingBottom =
              virtualItems.length > 0
                ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
                : 0;
            return (
              <>
                {paddingTop > 0 && (
                  <tr>
                    <td style={{ height: `${paddingTop}px` }} colSpan={999} />
                  </tr>
                )}
                {virtualItems.map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        'hover:bg-accent/30 transition-colors',
                        virtualRow.index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={cn(
                            'border border-border px-2 py-1 text-xs',
                            cell.column.id === 'rowNum' && 'sticky left-0 bg-inherit font-mono text-muted-foreground',
                            cell.column.id === 'country' && 'sticky left-[60px] bg-inherit font-medium',
                            cell.column.id === 'city' && 'sticky left-[180px] bg-inherit'
                          )}
                          style={{ width: cell.column.getSize(), minWidth: cell.column.getSize() }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {paddingBottom > 0 && (
                  <tr>
                    <td style={{ height: `${paddingBottom}px` }} colSpan={999} />
                  </tr>
                )}
              </>
            );
          })()}
        </tbody>
      </table>
    </div>
  );
}
