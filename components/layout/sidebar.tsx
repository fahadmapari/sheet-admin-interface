'use client';

import { type ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  Package,
  Settings,
  BookOpen,
  Share2,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/written-products', label: 'Written Products', icon: FileText },
  { href: '/assembly', label: 'Assembly Line', icon: Layers },
  { href: '/sources', label: 'Sources', icon: BookOpen },
  { href: '/shareables', label: 'Shareables', icon: Share2 },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

function SidebarLogo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className={cn('flex h-16 items-center border-b border-[hsl(var(--border))]', collapsed ? 'px-0 justify-center' : 'px-4')}>
      <div className={cn('flex items-center', !collapsed && 'min-w-0 gap-2')}>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[11px] font-semibold text-[hsl(var(--text-primary))]">
          SA
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[hsl(var(--text-primary))]">
              Sheet Admin
            </p>
            <p className="truncate text-xs text-[hsl(var(--text-tertiary))]">Tour Products</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function SidebarNav({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === '/'
                ? pathname === href
                : pathname === href || pathname.startsWith(`${href}/`);

            const linkClassName = cn(
              'flex h-8 items-center rounded-md text-sm text-[hsl(var(--text-secondary))] transition-colors',
              'hover:bg-[hsl(var(--surface))] hover:text-[hsl(var(--text-primary))]',
              isActive && 'bg-[hsl(var(--surface-raised))] font-medium text-[hsl(var(--text-primary))]',
              collapsed ? 'justify-center px-0' : 'gap-2 px-3',
            );

            if (collapsed) {
              return (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>
                    <Link href={href} onClick={onNavigate} className={linkClassName}>
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link key={href} href={href} onClick={onNavigate} className={linkClassName}>
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 border-r border-[hsl(var(--border))] bg-[hsl(var(--background))]',
        'overflow-visible transition-[width] duration-200 ease-in-out md:flex md:flex-col',
        collapsed ? 'w-12' : 'w-60',
      )}
    >
      <SidebarLogo collapsed={collapsed} />
      <SidebarNav collapsed={collapsed} />
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute right-0 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-sm hover:bg-[hsl(var(--surface))]"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
        ) : (
          <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
        )}
      </button>
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
