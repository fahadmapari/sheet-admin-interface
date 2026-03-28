export const dynamic = 'force-dynamic';

import { fetchInventoryUpdate } from '@/lib/sheets';

export default async function InventoryUpdatePage() {
  const rows = await fetchInventoryUpdate();

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <h1 className="text-2xl font-semibold mb-6">Inventory Update</h1>

      <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 mb-6 text-amber-800 text-sm">
        This page is read-only. Edit the &quot;Inventory Update&quot; sheet directly in Google Sheets.
      </div>

      {rows.map((row, rowIndex) => {
        // Skip empty rows (all cells empty or row is empty)
        const nonEmptyCells = row.filter((cell) => cell.trim() !== '');
        if (nonEmptyCells.length === 0) return null;

        // Single-cell heading: starts with capital letter, shorter than 80 chars
        if (
          nonEmptyCells.length === 1 &&
          /^[A-Z]/.test(nonEmptyCells[0]) &&
          nonEmptyCells[0].length < 80
        ) {
          return (
            <h3 key={rowIndex} className="font-semibold text-lg mt-6 mb-2">
              {nonEmptyCells[0]}
            </h3>
          );
        }

        // Multi-cell rows or single-cell rows not matching heading criteria
        return (
          <p key={rowIndex}>
            {nonEmptyCells.join(' — ')}
          </p>
        );
      })}
    </div>
  );
}
