'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { PresenceUser } from '@/lib/types';

const HEARTBEAT_INTERVAL_MS = 8_000;

async function sendHeartbeat(page: string): Promise<void> {
  try {
    await fetch('/api/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page }),
    });
  } catch {
    // heartbeat failures are silent
  }
}

export function usePresence(page: string): PresenceUser[] {
  useEffect(() => {
    void sendHeartbeat(page);
    const id = setInterval(() => void sendHeartbeat(page), HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [page]);

  const { data } = useSWR<{ users: PresenceUser[] }>(
    `/api/presence?page=${encodeURIComponent(page)}`,
    fetcher,
    { refreshInterval: HEARTBEAT_INTERVAL_MS },
  );

  return data?.users ?? [];
}
