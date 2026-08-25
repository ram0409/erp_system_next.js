"use client";

import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import Link from "next/link";

import { BrandAtmosphere } from "@/components/layout/brand-atmosphere";
import { NavList } from "@/components/layout/nav-list";
import { Button } from "@/components/ui/button";
import type { NavItem } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { usePersistedBoolean } from "@/hooks/use-persisted-boolean";
import { cn } from "@/lib/utils";

const COLLAPSE_STORAGE_KEY = "erp.sidebar.collapsed";

interface AppSidebarProps {
  /** Already filtered by permission on the server. */
  items: readonly NavItem[];
  appName: string;
}

export function AppSidebar({ items, appName }: AppSidebarProps) {
  // The server renders the expanded sidebar; the stored preference is adopted on
  // the client through the external-store subscription.
  const [collapsed, setCollapsed] = usePersistedBoolean(COLLAPSE_STORAGE_KEY, false);

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "sidebar-canvas border-sidebar-border relative sticky top-0 isolate hidden h-dvh shrink-0 flex-col overflow-hidden border-r transition-[width] duration-200 lg:flex",
        collapsed ? "w-[4.25rem]" : "w-64",
      )}
    >
      <BrandAtmosphere />

      <div
        className={cn(
          "border-sidebar-border relative z-10 flex h-14 items-center border-b px-3",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {collapsed ? null : (
          <Link
            href={ROUTES.DASHBOARD}
            className="text-sidebar-accent-foreground focus-visible:ring-sidebar-accent-foreground/70 flex min-w-0 items-center gap-2.5 rounded-sm text-sm font-semibold tracking-tight focus-visible:ring-2 focus-visible:outline-none"
          >
            <span
              className="brand-fill size-7 shrink-0 rounded-xl shadow-none"
              aria-hidden="true"
            />
            <span className="truncate">{appName}</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
          className="text-sidebar-muted-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent size-8"
        >
          {collapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
        </Button>
      </div>

      <div className="relative z-10 flex-1 scrollbar-thin overflow-y-auto py-3">
        <NavList items={items} collapsed={collapsed} />
      </div>
    </aside>
  );
}
