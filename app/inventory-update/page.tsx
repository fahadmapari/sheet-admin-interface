export const dynamic = 'force-dynamic';

import { fetchInventoryUpdate } from '@/lib/sheets';

import { Badge } from '@/components/ui/badge';

export default async function InventoryUpdatePage() {
  const rows = await fetchInventoryUpdate();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Inventory Update</h1>
        <p className="mt-1 text-sm text-[hsl(var(--text-secondary))]">
          Operational notes from the shared inventory sheet.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300">
        This page is read-only. Edit the &quot;Inventory Update&quot; sheet directly in Google Sheets.
      </div>

      <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]">
        <div className="flex flex-col gap-4 p-5">
          {rows.map((row, rowIndex) => {
            const nonEmptyCells = row.filter((cell) => cell.trim() !== '');
            if (nonEmptyCells.length === 0) return null;

            if (
              nonEmptyCells.length === 1 &&
              /^[A-Z]/.test(nonEmptyCells[0]) &&
              nonEmptyCells[0].length < 80
            ) {
              return (
                <div key={rowIndex} className="pt-2 first:pt-0">
                  <Badge variant="outline">{nonEmptyCells[0]}</Badge>
                </div>
              );
            }

            return (
              <p key={rowIndex} className="text-sm text-[hsl(var(--text-secondary))]">
                {nonEmptyCells.join(' — ')}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
