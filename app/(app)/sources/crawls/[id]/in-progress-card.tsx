// app/(app)/sources/crawls/[id]/in-progress-card.tsx
'use client';

const COPY: Record<string, { title: string; subtitle: string }> = {
  mapping: {
    title: 'Discovering URLs...',
    subtitle: 'Firecrawl is enumerating the URLs on this site.',
  },
  scraping: {
    title: 'Scraping selected pages...',
    subtitle: 'Firecrawl is fetching content from the URLs you picked. This can take a few minutes.',
  },
  classifying: {
    title: 'Classifying tours...',
    subtitle: 'Gemini is reading the scraped pages and scoring each one.',
  },
};

export function InProgressCard({ status }: { status: 'mapping' | 'scraping' | 'classifying' }) {
  const c = COPY[status];
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[hsl(var(--border))] py-12">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[hsl(var(--text-tertiary))] border-t-transparent" />
      <p className="text-sm font-medium">{c.title}</p>
      <p className="text-xs text-[hsl(var(--text-tertiary))]">{c.subtitle}</p>
    </div>
  );
}
