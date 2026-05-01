import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/access-control';
import { errorResponse } from '@/lib/api-errors';
import { getCrawlJob } from '@/lib/sources/crawl-jobs';
import { importSources } from '@/lib/sources/sources-store';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userEmail = session.user.email;
  if (!(await isAdmin(userEmail))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json()) as {
    items?: Array<{
      url: string;
      tourName: string;
      city: string;
      country: string;
      confidence: number;
    }>;
  };
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 400 });
  }

  try {
    const job = await getCrawlJob(id);
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (job.status !== 'ready_for_review') {
      return NextResponse.json(
        { error: `Cannot import from status ${job.status}` },
        { status: 409 },
      );
    }

    const cleaned = items
      .map((i) => ({
        crawlJobId: id,
        tourName: i.tourName?.trim(),
        url: i.url?.trim(),
        city: i.city?.trim(),
        country: i.country?.trim(),
        providerName: job.providerName,
        geminiConfidence: Math.max(0, Math.min(100, Math.round(i.confidence ?? 0))),
        importedBy: userEmail,
      }))
      .filter((i) => i.tourName && i.url && i.city && i.country);

    if (cleaned.length === 0) {
      return NextResponse.json({ error: 'No valid items to import' }, { status: 400 });
    }

    const result = await importSources(cleaned);
    return NextResponse.json({
      importedCount: result.importedCount,
      skippedCount: result.skippedCount + (items.length - cleaned.length),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
