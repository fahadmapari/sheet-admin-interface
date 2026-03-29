'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Menu } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MobileSidebar } from '@/components/layout/sidebar';

function formatSegment(segment: string) {
  if (/^\d+$/.test(segment)) return `Row ${segment}`;
  return segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function Header() {
  const pathname = usePathname();

  const segments = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);

    if (parts.length === 0) {
      return [{ label: 'Dashboard', href: '/' }];
    }

    return parts.map((part, index) => ({
      label: formatSegment(part),
      href: `/${parts.slice(0, index + 1).join('/')}`,
    }));
  }, [pathname]);

  return (
    <header className="sticky top-0 z-[var(--z-header)] flex h-12 items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background)_/_0.8)] px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="md:hidden">
          <MobileSidebar>
            <Button variant="ghost" size="icon" aria-label="Open navigation">
              <Menu className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </MobileSidebar>
        </div>
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap">
            {segments.map((segment, index) => (
              <LinkFragment key={segment.href}>
                <BreadcrumbItem>
                  {index === segments.length - 1 ? (
                    <BreadcrumbPage>{segment.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={segment.href}>{segment.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {index < segments.length - 1 && <BreadcrumbSeparator />}
              </LinkFragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" strokeWidth={1.5} />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="overflow-hidden rounded-full">
              <Avatar className="h-7 w-7">
                <AvatarImage alt="User avatar" />
                <AvatarFallback>FA</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="space-y-0.5">
              <div className="text-sm font-medium text-[hsl(var(--text-primary))]">Fahad</div>
              <div className="text-xs text-[hsl(var(--text-secondary))]">Admin workspace</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Profile</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function LinkFragment({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
