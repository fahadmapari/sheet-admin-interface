// app/(app)/sources/crawls/[id]/page.tsx
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { CrawlDetailClient } from './crawl-detail-client';

export default async function CrawlDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const email = session?.user?.email ?? '';
  const admin = email ? await isAdmin(email) : false;
  return <CrawlDetailClient id={id} isAdmin={admin} />;
}
