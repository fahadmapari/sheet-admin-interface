'use client';

import { useState } from 'react';
import type { VisibilityState } from '@tanstack/react-table';
import { ProductTable } from '@/components/products/product-table';
import { ColumnVisibilityPanel } from '@/components/products/column-visibility';

export function ProductsClient() {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h1 className="text-xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">Manage tour product data</p>
        </div>
        <div className="flex items-center gap-2">
          <ColumnVisibilityPanel
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
          />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <ProductTable
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
        />
      </div>
    </div>
  );
}
