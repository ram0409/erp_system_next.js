"use client";

import { MenuIcon } from "lucide-react";
import { useState } from "react";

import { NavList } from "@/components/layout/nav-list";
import { SidebarBrandMark } from "@/components/layout/sidebar-brand-mark";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { NavItem } from "@/constants/navigation";

interface MobileNavProps {
  items: readonly NavItem[];
  companyName: string;
  logoUrl?: string | null;
}

/** Drawer navigation for tablet and mobile. Radix handles the focus trap. */
export function MobileNav({ items, companyName, logoUrl }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open navigation" className="lg:hidden">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="bg-sidebar text-sidebar-foreground border-sidebar-border overflow-hidden"
      >
        <div className="border-sidebar-border relative flex h-14 items-center gap-2.5 border-b px-4">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-white/10 to-transparent"
            aria-hidden="true"
          />
          <SidebarBrandMark companyName={companyName} logoUrl={logoUrl} />
          <SheetTitle className="text-sidebar-accent-foreground text-sm font-semibold tracking-tight">
            {companyName}
          </SheetTitle>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto py-3">
          <NavList items={items} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
