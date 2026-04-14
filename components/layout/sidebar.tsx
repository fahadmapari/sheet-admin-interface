'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Layers, Package, Settings, BookOpen, Share2 } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/assembly', label: 'Assembly Line', icon: Layers },
  { href: '/sources', label: 'Sources', icon: BookOpen },
  { href: '/shareables', label: 'Shareables', icon: Share2 },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

function SidebarLogo() {
  return (
    <div className="flex h-16 items-center border-b border-[hsl(var(--border))] px-4">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[11px] font-semibold text-[hsl(var(--text-primary))]">
          SA
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[hsl(var(--text-primary))]">
            Sheet Admin
          </p>
          <p className="truncate text-xs text-[hsl(var(--text-tertiary))]">Tour Products</p>
        </div>
      </div>
    </div>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4">
      <div className="space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                'flex h-8 items-center gap-2 rounded-md px-3 text-sm text-[hsl(var(--text-secondary))] transition-colors',
                'hover:bg-[hsl(var(--surface))] hover:text-[hsl(var(--text-primary))]',
                isActive &&
                  'bg-[hsl(var(--surface-raised))] font-medium text-[hsl(var(--text-primary))]',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-[hsl(var(--border))] bg-[hsl(var(--background))] md:flex md:flex-col">
      <SidebarLogo />
      <SidebarNav />
    </aside>
  );
}

export function MobileSidebar({ children }: { children: ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="left" className="w-60 p-0">
        <div className="flex h-full flex-col">
          <SidebarLogo />
          <SidebarNav />
        </div>
      </SheetContent>
    </Sheet>
  );
}
