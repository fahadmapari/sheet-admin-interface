'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  functionalUpdate,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronRight, MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSWRConfig } from 'swr';
import { cn, toBoolean, toNumber } from '@/lib/utils';
import { ALWAYS_VISIBLE_COLUMNS, BOOLEAN_FIELDS, COLUMN_GROUPS, FIELD_LABELS, NUMBER_FIELDS } from '@/lib/constants';
import type { TourProduct } from '@/lib/types';
import { InlineEditCell } from './inline-edit-cell';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

// Column width map
const COL_WIDTHS: Partial<Record<keyof TourProduct | 'rowNum' | 'select' | 'actions', number>> = {
  select: 40,
  rowNum: 60,
  actions: 40,
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


function buildColumns(
  onCellSaved: (rowIndex: number, field: string, value: string) => void,
  onDeleteRequest: (product: TourProduct) => void,
): ColumnDef<TourProduct>[] {
  const cols: ColumnDef<TourProduct>[] = [
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
      size: COL_WIDTHS.select,
      enableSorting: false,
      enableHiding: false,
    },
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
        cell: ({ row }) => (
          <InlineEditCell
            product={row.original}
            field={key}
            onSaved={(f, v) => onCellSaved(row.original.rowIndex, f, v)}
          />
        ),
      });
    }
  }

  cols.push({
    id: 'actions',
    header: '',
    cell: ({ row }) => <RowActionsMenu product={row.original} onDeleteRequest={onDeleteRequest} />,
    size: COL_WIDTHS.actions,
    enableSorting: false,
    enableHiding: false,
  });

  return cols;
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
          className="h-6 w-6 opacity-0 group-hover/row:opacity-100 transition-opacity"
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
  data: TourProduct[];
  isLoading: boolean;
  error: unknown;
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => void;
  rowSelection: RowSelectionState;
  onRowSelectionChange: (updater: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)) => void;
  onDeleteRequest: (product: TourProduct) => void;
}

export function ProductTable({
  data,
  isLoading,
  error,
  columnVisibility,
  onColumnVisibilityChange,
  rowSelection,
  onRowSelectionChange,
  onDeleteRequest,
}: ProductTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const { mutate } = useSWRConfig();

  const onCellSaved = useCallback(
    (rowIndex: number, field: string, value: string) => {
      mutate('/api/products', (current: TourProduct[] | undefined) => {
        if (!current) return current;
        return current.map((p) => {
          if (p.rowIndex !== rowIndex) return p;
          const fieldKey = field as keyof TourProduct;
          let typedValue: string | boolean | number | null = value;
          if (BOOLEAN_FIELDS.has(fieldKey)) {
            typedValue = toBoolean(value);
          } else if (NUMBER_FIELDS.has(fieldKey)) {
            typedValue = toNumber(value);
          } else if (value === '') {
            typedValue = null;
          }
          return { ...p, [field]: typedValue };
        });
      }, { revalidate: false });
    },
    [mutate],
  );

  const columns = useMemo(() => buildColumns(onCellSaved, onDeleteRequest), [onCellSaved, onDeleteRequest]);

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { sorting, columnVisibility, rowSelection },
    onSortingChange: setSorting,
    onColumnVisibilityChange: (updater) => {
      onColumnVisibilityChange(functionalUpdate(updater, columnVisibility));
    },
    onRowSelectionChange: (updater) => {
      onRowSelectionChange(functionalUpdate(updater, rowSelection));
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    enableMultiSort: false,
  });

  const rows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 20,
  });

  const isGroupCollapsed = (groupId: string): boolean => {
    const group = COLUMN_GROUPS.find(g => g.id === groupId);
    if (!group) return false;
    return group.fields.some(
      f => !ALWAYS_VISIBLE_COLUMNS.has(f) && columnVisibility[f] === false
    );
  };

  const toggleGroup = (groupId: string) => {
    const group = COLUMN_GROUPS.find((g) => g.id === groupId);
    if (!group) return;
    const isCurrentlyCollapsed = isGroupCollapsed(groupId);
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

  // All visible columns except select, rowNum, and actions (handled separately in rowSpan headers)
  const visibleDataHeaders = table
    .getAllColumns()
    .filter((col) => col.id !== 'rowNum' && col.id !== 'select' && col.id !== 'actions' && col.getIsVisible());

  return (
    <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
      <table className="border-collapse text-sm table-fixed">
        <thead className="sticky top-0 z-20">
          {/* Group header row */}
          <tr style={{ background: 'hsl(var(--muted))' }}>
            {/* select checkbox spanning both header rows */}
            <th
              className="border border-border px-2 py-1.5 text-center sticky left-0 z-30"
              style={{ background: 'hsl(var(--muted))', width: 40, minWidth: 40 }}
              rowSpan={2}
            >
              <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
              />
            </th>
            {/* rowNum spanning both header rows */}
            <th
              className="border border-border px-2 py-1.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap sticky left-[40px] z-30"
              style={{ background: 'hsl(var(--muted))' }}
              rowSpan={2}
            >
              #
            </th>
            {COLUMN_GROUPS.map((group) => {
              const visCount = groupVisibleCounts[group.id];
              if (visCount === 0) return null;
              const isCollapsed = isGroupCollapsed(group.id);
              const colSpan = visCount;

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
            {/* actions column spanning both header rows */}
            <th
              className="border border-border px-1 py-1.5 sticky z-30"
              style={{ background: 'hsl(var(--muted))', width: 40, minWidth: 40 }}
              rowSpan={2}
            />
          </tr>
          {/* Column header row */}
          <tr style={{ background: 'hsl(var(--muted))' }}>
            {visibleDataHeaders.map((col) => {
              const size = col.getSize();
              const header = table.getFlatHeaders().find((h) => h.id === col.id);
              return (
                <th
                  key={col.id}
                  className={cn(
                    'border border-border px-2 py-1.5 text-left text-xs font-medium whitespace-nowrap cursor-pointer select-none',
                    'hover:bg-accent/50',
                    col.id === 'country' && 'sticky left-[100px] z-30 bg-muted',
                    col.id === 'city' && 'sticky left-[220px] z-30 bg-muted shadow-[2px_0_4px_rgba(0,0,0,0.06)]'
                  )}
                  style={{
                    width: size,
                    minWidth: size,
                  }}
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
                  const stickyBg = row.getIsSelected()
                    ? 'hsl(var(--accent))'
                    : 'hsl(var(--background))';
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        'group/row hover:bg-accent/30 transition-colors',
                        row.getIsSelected() && 'bg-accent/20',
                        !row.getIsSelected() && virtualRow.index % 2 === 0 && 'bg-background',
                        !row.getIsSelected() && virtualRow.index % 2 !== 0 && 'bg-muted/20'
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={cn(
                            'border border-border px-2 py-1 text-xs',
                            cell.column.id === 'select' && 'sticky left-0 z-10 text-center',
                            cell.column.id === 'rowNum' && 'sticky left-[40px] z-10 font-mono text-muted-foreground',
                            cell.column.id === 'country' && 'sticky left-[100px] z-10 font-medium',
                            cell.column.id === 'city' && 'sticky left-[220px] z-10 shadow-[2px_0_4px_rgba(0,0,0,0.06)]',
                            cell.column.id === 'actions' && 'px-1'
                          )}
                          style={{
                            width: cell.column.getSize(),
                            minWidth: cell.column.getSize(),
                            ...(cell.column.id === 'select' || cell.column.id === 'rowNum' || cell.column.id === 'country' || cell.column.id === 'city'
                              ? { background: stickyBg }
                              : {}),
                          }}
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
