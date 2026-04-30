import { NextResponse } from 'next/server';
import { fetchAllRows } from '@/lib/sheets';
import { requireGoogleAccessToken } from '@/lib/google-session';
import { errorResponse } from '@/lib/api-errors';
import { toBoolean, toText } from '@/lib/utils';
import type { StatsResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const accessToken = await requireGoogleAccessToken();
    const rows = await fetchAllRows({ auth: 'user', accessToken });
    const data = rows.slice(1);

    let readyForUpload = 0, uploaded = 0, inProgress = 0,
        completed = 0, highPriority = 0, onHold = 0, ignored = 0;

    for (const row of data) {
      if (toBoolean(row[65])) readyForUpload++;
      const pic = toText(row[66]);
      if (pic && pic !== 'No') uploaded++;
      const status = toText(row[7]);
      if (status === 'In Progress') inProgress++;
      else if (status === 'Completed') completed++;
      else if (status === 'In Progress - High priority') highPriority++;
      else if (status === 'On hold') onHold++;
      else if (status === 'Ignored') ignored++;
    }

    const stats: StatsResponse = {
      total: data.length,
      readyForUpload,
      uploaded,
      inProgress,
      completed,
      highPriority,
      onHold,
      ignored,
    };

    return NextResponse.json(stats);
  } catch (err) {
    return errorResponse(err);
  }
}
