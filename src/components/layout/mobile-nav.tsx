"use client";

import { MenuIcon } from "lucide-react";
import { useState } from "react";

import { BrandAtmosphere } from "@/components/layout/brand-atmosphere";
import { NavList } from "@/components/layout/nav-list";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { NavItem } from "@/constants/navigation";

interface MobileNavProps {
  items: readonly NavItem[];
  appName: string;
}

/** Drawer navigation for tablet and mobile. Radix handles the focus trap. */
export function MobileNav({ items, appName }: MobileNavProps) {
  // Closed by NavList's onNavigate callback below, so a route change never
  // leaves the drawer covering the page it navigated to.
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
        className="sidebar-canvas text-sidebar-foreground relative isolate overflow-hidden"
      >
        <BrandAtmosphere />
        <div className="border-sidebar-border relative z-10 flex h-14 items-center gap-2.5 border-b px-4">
          <span className="brand-fill size-7 shrink-0 rounded-xl shadow-none" aria-hidden="true" />
          <SheetTitle className="text-sidebar-accent-foreground text-sm font-semibold tracking-tight">
            {appName}
          </SheetTitle>
        </div>
        <div className="relative z-10 flex-1 scrollbar-thin overflow-y-auto py-3">
          <NavList items={items} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
