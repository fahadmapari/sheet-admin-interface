'use client';

import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppNotification } from '@/lib/types';

interface NotificationDropdownProps {
  notifications: AppNotification[];
  isLoading: boolean;
  onMarkAllRead: () => void;
}

export function NotificationDropdown({
  notifications,
  isLoading,
  onMarkAllRead,
}: NotificationDropdownProps) {
  return (
    <div className="w-[380px]">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-3 py-2">
        <span className="text-sm font-medium">Notifications</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onMarkAllRead}
          disabled={notifications.every((n) => n.read)}
        >
          Mark all as read
        </Button>
      </div>
      <ScrollArea className="max-h-[400px]">
        {isLoading ? (
          <div className="space-y-1 p-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-[hsl(var(--text-secondary))]">
            No notifications yet
          </div>
        ) : (
          <div className="p-1">
            {notifications.map((n) => (
              <div
                key={n._id}
                className={`rounded-md px-3 py-2.5 text-sm ${
                  !n.read ? 'bg-[hsl(var(--surface))]' : ''
                }`}
              >
                <p className="font-medium text-[hsl(var(--text-primary))]">
                  Batch &ldquo;{n.batchName}&rdquo; ({n.productCount} product
                  {n.productCount !== 1 ? 's' : ''}) moved to {n.stage}
                </p>
                <p className="mt-0.5 text-xs text-[hsl(var(--text-secondary))]">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
