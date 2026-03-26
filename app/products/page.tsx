import { ProductTable } from '@/components/products/product-table';

export default function ProductsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h1 className="text-xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">Manage tour product data</p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <ProductTable />
      </div>
    </div>
  );
}
