import { SheetLinksClient } from './sheet-links-client';

export default function SheetLinksPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Sheet Storage</h1>
      <SheetLinksClient />
    </div>
  );
}
