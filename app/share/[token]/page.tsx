import { getShareableLinkByToken } from '@/lib/shareables';
import { fetchAllRows, fetchColumnHyperlinks, fetchColumnRichTextLinks } from '@/lib/sheets';
import { getEffectiveColumnMap } from '@/lib/column-mapping';
import { rowToProduct } from '@/lib/utils';
import {
  MULTI_SELECT_FILTERS,
  TRI_STATE_FILTERS,
  PRESENCE_FILTERS,
  matchesMultiFilter,
  matchesTriStateFilter,
  matchesPresenceFilter,
} from '@/lib/product-filters';
import { ShareableProductTable } from '@/components/share/shareable-product-table';
import type { TourProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;

  const link = await getShareableLinkByToken(token);

  if (!link) {
    return <ExpiredState />;
  }

  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return <ExpiredState />;
  }

  const sheetsAuth = { auth: 'service' as const };
  const [colMap, rows] = await Promise.all([
    getEffectiveColumnMap(),
    fetchAllRows(sheetsAuth),
  ]);

  const linkColIndex = colMap['link'];
  const imageLinksColIndex = colMap['imageLinks'];

  const [linkHyperlinks, imageLinksRichText] = await Promise.all([
    fetchColumnHyperlinks(sheetsAuth, linkColIndex),
    fetchColumnRichTextLinks(sheetsAuth, imageLinksColIndex),
  ]);

  const allProducts: TourProduct[] = rows
    .slice(1)
    .map((row, i) => {
      const rowIndex = i + 2;
      return rowToProduct(row, rowIndex, linkHyperlinks.get(rowIndex), imageLinksRichText.get(rowIndex), colMap);
    });

  const filteredProducts = allProducts.filter((p) => {
    for (const { key, productKey } of MULTI_SELECT_FILTERS) {
      if (!matchesMultiFilter(p[productKey], link.filters[key])) return false;
    }
    for (const { key, productKey } of TRI_STATE_FILTERS) {
      if (!matchesTriStateFilter(p[productKey], link.filters[key])) return false;
    }
    for (const { key, productKey } of PRESENCE_FILTERS) {
      if (!matchesPresenceFilter(p[productKey], link.filters[key])) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-screen-xl px-4 py-8 md:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">{link.title}</h1>
          <p className="mt-1 text-sm text-[hsl(var(--text-tertiary))]">
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <ShareableProductTable products={filteredProducts} columns={link.columns} />
      </div>
      <footer className="mt-12 border-t border-[hsl(var(--border))] py-4 text-center text-xs text-[hsl(var(--text-tertiary))]">
        Powered by Sheet Admin
      </footer>
    </div>
  );
}

function ExpiredState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <p className="text-lg font-medium text-[hsl(var(--text-primary))]">
          This link is no longer available
        </p>
        <p className="mt-1 text-sm text-[hsl(var(--text-tertiary))]">
          The shareable link has expired or been removed.
        </p>
      </div>
    </div>
  );
}
