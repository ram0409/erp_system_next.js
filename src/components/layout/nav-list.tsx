"use client";

import { ChevronDownIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { NAV_ICONS } from "@/components/layout/nav-icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { NavGroup, NavItem, NavLeaf } from "@/constants/navigation";
import { cn } from "@/lib/utils";

interface NavListProps {
  items: readonly NavItem[];
  /** Icon-only rail on desktop. Never collapsed inside the mobile drawer. */
  collapsed?: boolean;
  /** Closes the mobile drawer after a navigation. */
  onNavigate?: () => void;
}

function isRouteActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavList({ items, collapsed = false, onNavigate }: NavListProps) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [pendingForPath, setPendingForPath] = useState(pathname);

  if (pendingForPath !== pathname) {
    setPendingForPath(pathname);
    setPendingHref(null);
  }

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-1 px-2">
      {items.map((item) =>
        item.kind === "link" ? (
          <NavLink
            key={item.href}
            item={item}
            active={isRouteActive(pathname, item.href)}
            pending={pendingHref === item.href}
            collapsed={collapsed}
            onNavigate={onNavigate}
            onPending={() => setPendingHref(item.href)}
          />
        ) : (
          <NavGroupItem
            key={item.id}
            group={item}
            pathname={pathname}
            pendingHref={pendingHref}
            collapsed={collapsed}
            onNavigate={onNavigate}
            onPending={setPendingHref}
          />
        ),
      )}
    </nav>
  );
}

const linkBaseClasses =
  "group flex items-center gap-2.5 rounded-full px-2.5 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent-foreground/70";

function NavLink({
  item,
  active,
  pending,
  collapsed,
  onNavigate,
  onPending,
  nested = false,
}: {
  item: NavLeaf;
  active: boolean;
  pending: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
  onPending: () => void;
  nested?: boolean;
}) {
  const Icon = NAV_ICONS[item.icon];
  const highlighted = active || pending;

  const link = (
    <Link
      href={item.href}
      prefetch
      onClick={() => {
        if (!active) {
          onPending();
        }
        onNavigate?.();
      }}
      aria-current={active ? "page" : undefined}
      aria-busy={pending && !active ? true : undefined}
      className={cn(
        linkBaseClasses,
        highlighted
          ? "brand-fill brand-glow text-white"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        pending && !active && "opacity-80",
        collapsed && "justify-center px-0",
        nested && !collapsed && "pl-3",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {collapsed ? <span className="sr-only">{item.label}</span> : <span>{item.label}</span>}
    </Link>
  );

  if (!collapsed) {
    return link;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function NavGroupItem({
  group,
  pathname,
  pendingHref,
  collapsed,
  onNavigate,
  onPending,
}: {
  group: NavGroup;
  pathname: string;
  pendingHref: string | null;
  collapsed: boolean;
  onNavigate?: () => void;
  onPending: (href: string) => void;
}) {
  const hasActiveChild = group.children.some((child) => isRouteActive(pathname, child.href));
  const Icon = NAV_ICONS[group.icon];

  /**
   * Open state is derived from the route so deep-linking into a child reveals the
   * section it belongs to. A manual toggle overrides that, and the override is
   * discarded as soon as the route moves in or out of this section — which keeps
   * the behaviour correct without an effect syncing state to props.
   */
  const [override, setOverride] = useState<{ forActiveChild: boolean; open: boolean } | null>(null);
  const open = override?.forActiveChild === hasActiveChild ? override.open : hasActiveChild;

  if (collapsed) {
    return (
      <div className="flex flex-col gap-1">
        {group.children.map((child) => (
          <NavLink
            key={child.href}
            item={child}
            active={isRouteActive(pathname, child.href)}
            pending={pendingHref === child.href}
            collapsed
            onNavigate={onNavigate}
            onPending={() => onPending(child.href)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOverride({ forActiveChild: hasActiveChild, open: !open })}
        aria-expanded={open}
        className={cn(
          linkBaseClasses,
          "w-full",
          hasActiveChild
            ? "text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent",
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDownIcon
          className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div className="border-sidebar-border ml-4 flex flex-col gap-1 border-l pl-2">
          {group.children.map((child) => (
            <NavLink
              key={child.href}
              item={child}
              active={isRouteActive(pathname, child.href)}
              pending={pendingHref === child.href}
              collapsed={false}
              onNavigate={onNavigate}
              onPending={() => onPending(child.href)}
              nested
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
