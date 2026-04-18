'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePresence } from '@/lib/hooks/use-presence';
import type { PresenceUser } from '@/lib/types';

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function PresenceAvatars({ page }: { page: string }) {
  const users = usePresence(page);

  if (users.length === 0) return null;

  const visibleUsers = users.slice(0, 4);
  const overflowCount = users.length - 4;

  return (
    <TooltipProvider>
      <div className="flex items-center">
        {visibleUsers.map((user: PresenceUser, index: number) => (
          <Tooltip key={user.email}>
            <TooltipTrigger asChild>
              <Avatar
                className={`h-7 w-7 ring-2 ring-[hsl(var(--background))]${index > 0 ? ' -ml-2' : ''}`}
              >
                <AvatarImage src={user.image ?? undefined} alt={user.name} />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>{user.name}</TooltipContent>
          </Tooltip>
        ))}
        {overflowCount > 0 && (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[10px] font-medium text-[hsl(var(--text-secondary))] -ml-2 ring-2 ring-[hsl(var(--background))] border border-[hsl(var(--border))]">
            +{overflowCount}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
