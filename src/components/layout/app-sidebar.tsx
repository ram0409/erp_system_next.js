"use client";

import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import Link from "next/link";

import { NavList } from "@/components/layout/nav-list";
import { SidebarBrandMark } from "@/components/layout/sidebar-brand-mark";
import { Button } from "@/components/ui/button";
import type { NavItem } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { usePersistedBoolean } from "@/hooks/use-persisted-boolean";
import { cn } from "@/lib/utils";

const COLLAPSE_STORAGE_KEY = "erp.sidebar.collapsed";

interface AppSidebarProps {
  /** Already filtered by permission on the server. */
  items: readonly NavItem[];
  companyName: string;
  logoUrl?: string | null;
}

export function AppSidebar({ items, companyName, logoUrl }: AppSidebarProps) {
  const [collapsed, setCollapsed] = usePersistedBoolean(COLLAPSE_STORAGE_KEY, false);

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "app-chrome-sidebar relative sticky top-0 hidden h-dvh shrink-0 flex-col transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex",
        collapsed ? "w-[4.25rem]" : "w-60",
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/10 to-transparent"
        aria-hidden="true"
      />
      <div
        className={cn(
          "border-sidebar-border relative flex border-b px-3",
          collapsed
            ? "h-auto flex-col items-center gap-2 py-3"
            : "h-14 items-center justify-between gap-2.5",
        )}
      >
        <Link
          href={ROUTES.DASHBOARD}
          className="text-sidebar-accent-foreground focus-visible:ring-sidebar-accent-foreground/50 group/brand flex min-w-0 items-center gap-2.5 rounded-md focus-visible:ring-2 focus-visible:outline-none"
        >
          <SidebarBrandMark companyName={companyName} logoUrl={logoUrl} />
          {collapsed ? (
            <span className="sr-only">{companyName}</span>
          ) : (
            <span className="truncate text-sm font-semibold tracking-tight">{companyName}</span>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
          className="text-sidebar-muted-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent size-8 shrink-0 transition-transform duration-200 hover:scale-105"
        >
          {collapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
        </Button>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto py-3">
        <NavList items={items} collapsed={collapsed} />
      </div>
    </aside>
  );
}
