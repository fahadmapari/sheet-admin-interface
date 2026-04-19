'use client';

import { useEffect, useRef } from 'react';
import useSWR from 'swr';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { NotificationDropdown } from '@/components/notifications/notification-dropdown';
import { fetcher } from '@/lib/fetcher';
import type { AppNotification } from '@/lib/types';

export function NotificationBell() {
  const { data, isLoading, mutate } = useSWR<{ notifications: AppNotification[] }>(
    '/api/notifications',
    fetcher,
    { refreshInterval: 30_000 },
  );

  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Track IDs seen in the previous poll to detect newly arrived notifications
  const prevIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (!data) return;

    const currentIds = new Set(notifications.map((n) => n._id));

    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      prevIdsRef.current = currentIds;
      return;
    }

    for (const n of notifications) {
      if (!prevIdsRef.current.has(n._id) && !n.read) {
        toast.info(
          `Batch "${n.batchName}" (${n.productCount} product${
            n.productCount !== 1 ? 's' : ''
          }) moved to ${n.stage}`,
        );
      }
    }

    prevIdsRef.current = currentIds;
  }, [notifications, data]);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-read', { method: 'POST' });
      if (!res.ok) throw new Error(res.statusText);
      await mutate(
        (current) =>
          current
            ? { notifications: current.notifications.map((n) => ({ ...n, read: true })) }
            : current,
        { revalidate: true },
      );
    } catch {
      toast.error('Failed to mark notifications as read');
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="h-4 w-4" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] font-medium text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(380px,calc(100vw-1rem))] overflow-x-hidden p-0">
        <NotificationDropdown
          notifications={notifications}
          isLoading={isLoading}
          onMarkAllRead={handleMarkAllRead}
        />
      </PopoverContent>
    </Popover>
  );
}
