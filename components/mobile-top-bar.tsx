'use client';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SidebarNav } from '@/components/sidebar';

export function MobileTopBar() {
  return (
    <div className="md:hidden flex items-center px-4 h-14 border-b bg-background">
      <Sheet>
        <SheetTrigger asChild>
          <button className="p-1 rounded-md hover:bg-accent" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-56 p-0 bg-sidebar text-sidebar-foreground">
          <div className="flex h-14 items-center border-b border-sidebar-border px-4">
            <span className="font-semibold text-sidebar-primary">Sheet Admin</span>
          </div>
          <SidebarNav />
        </SheetContent>
      </Sheet>
      <span className="ml-3 font-semibold">Sheet Admin</span>
    </div>
  );
}
