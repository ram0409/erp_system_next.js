"use client";

import { ChevronDownIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";

import { NAV_ICONS } from "@/components/layout/nav-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

function isRouteActive(pathname: string, href: string, matchHrefs?: readonly string[]): boolean {
  const paths = [href, ...(matchHrefs ?? [])];
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
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
    <nav aria-label="Main navigation" className="flex flex-col gap-0.5 px-2.5">
      {items.map((item, index) =>
        item.kind === "link" ? (
          <NavLink
            key={item.href}
            item={item}
            active={isRouteActive(pathname, item.href, item.matchHrefs)}
            pending={pendingHref === item.href}
            collapsed={collapsed}
            enterIndex={index}
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
            enterIndex={index}
            onNavigate={onNavigate}
            onPending={setPendingHref}
          />
        ),
      )}
    </nav>
  );
}

const linkBaseClasses =
  "group relative flex items-center gap-2.5 rounded-lg px-2 py-[0.4rem] text-[13px] font-medium outline-none transition-[background-color,color,transform,box-shadow] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-sidebar-accent-foreground/50 motion-safe:hover:translate-x-0.5";

function NavLink({
  item,
  active,
  pending,
  collapsed,
  enterIndex,
  onNavigate,
  onPending,
}: {
  item: NavLeaf;
  active: boolean;
  pending: boolean;
  collapsed: boolean;
  enterIndex: number;
  onNavigate?: () => void;
  onPending: () => void;
}) {
  const Icon = NAV_ICONS[item.icon] ?? NAV_ICONS.dashboard;
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
      style={{ animationDelay: `${enterIndex * 35}ms` }}
      className={cn(
        linkBaseClasses,
        "animate-sidebar-item-in",
        highlighted
          ? "bg-sidebar-active/20 text-sidebar-active-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--sidebar-active)_28%,transparent)]"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        pending && !active && "opacity-80",
        collapsed && "justify-center px-0 hover:translate-x-0",
      )}
    >
      {highlighted ? (
        <span
          className="bg-sidebar-active absolute inset-y-1.5 left-0 w-[3px] origin-center rounded-full shadow-[0_0_10px_var(--sidebar-active)] animate-sidebar-indicator"
          aria-hidden="true"
        />
      ) : null}
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-lg transition-[background-color,color,transform] duration-200",
          highlighted
            ? "bg-sidebar-active/30 text-sidebar-active-foreground"
            : "text-sidebar-muted-foreground group-hover:bg-sidebar-accent group-hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon
          className="size-4 transition-transform duration-200 group-hover:scale-110"
          aria-hidden="true"
        />
      </span>
      {collapsed ? (
        <span className="sr-only">{item.label}</span>
      ) : (
        <span className="truncate">{item.label}</span>
      )}
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
  enterIndex,
  onNavigate,
  onPending,
}: {
  group: NavGroup;
  pathname: string;
  pendingHref: string | null;
  collapsed: boolean;
  enterIndex: number;
  onNavigate?: () => void;
  onPending: (href: string) => void;
}) {
  const panelId = useId();
  const hasActiveChild = group.children.some((child) =>
    isRouteActive(pathname, child.href, child.matchHrefs),
  );
  const [open, setOpen] = useState(true);
  const [openedForPath, setOpenedForPath] = useState(pathname);

  if (openedForPath !== pathname) {
    setOpenedForPath(pathname);
    if (hasActiveChild) {
      setOpen(true);
    }
  }

  if (collapsed) {
    const Icon = NAV_ICONS[group.icon] ?? NAV_ICONS.dashboard;
    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger
              aria-label={group.label}
              aria-current={hasActiveChild ? "true" : undefined}
              className={cn(
                linkBaseClasses,
                "w-full justify-center px-0 hover:translate-x-0",
                hasActiveChild
                  ? "bg-sidebar-active/20 text-sidebar-active-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-md transition-colors duration-200",
                  hasActiveChild ? "bg-sidebar-active/30" : "group-hover:bg-sidebar-accent",
                )}
              >
                <Icon
                  className="size-4 transition-transform duration-200 group-hover:scale-110"
                  aria-hidden="true"
                />
              </span>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">{group.label}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          side="right"
          align="start"
          className="border-sidebar-border bg-sidebar text-sidebar-foreground min-w-48"
        >
          <DropdownMenuLabel className="text-sidebar-muted-foreground">{group.label}</DropdownMenuLabel>
          {group.children.map((child) => {
            const ChildIcon = NAV_ICONS[child.icon] ?? NAV_ICONS.dashboard;
            const active = isRouteActive(pathname, child.href, child.matchHrefs);
            return (
              <DropdownMenuItem
                key={child.href}
                asChild
                className={cn(
                  "focus:bg-sidebar-accent focus:text-sidebar-accent-foreground [&_svg]:text-sidebar-muted-foreground",
                  active && "bg-sidebar-accent text-sidebar-accent-foreground",
                )}
              >
                <Link
                  href={child.href}
                  prefetch
                  onClick={() => {
                    if (!active) {
                      onPending(child.href);
                    }
                    onNavigate?.();
                  }}
                >
                  <ChildIcon />
                  {child.label}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const GroupIcon = NAV_ICONS[group.icon] ?? NAV_ICONS.dashboard;

  return (
    <div
      className="mt-2 flex flex-col first:mt-0"
      style={{ animationDelay: `${enterIndex * 35}ms` }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          linkBaseClasses,
          "text-sidebar-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground w-full",
          hasActiveChild && "text-sidebar-accent-foreground",
        )}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md">
          <GroupIcon className="size-4" aria-hidden="true" />
        </span>
        <span className="truncate text-[10px] font-semibold tracking-[0.16em] uppercase">
          {group.label}
        </span>
        <ChevronDownIcon
          className={cn(
            "ml-auto size-3.5 shrink-0 transition-transform duration-200 ease-out",
            open ? "rotate-0" : "-rotate-90",
          )}
          aria-hidden="true"
        />
      </button>
      <div
        id={panelId}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="flex flex-col gap-0.5 overflow-hidden">
          {group.children.map((child, childIndex) => (
            <NavLink
              key={child.href}
              item={child}
              active={isRouteActive(pathname, child.href, child.matchHrefs)}
              pending={pendingHref === child.href}
              collapsed={false}
              enterIndex={enterIndex + childIndex + 1}
              onNavigate={onNavigate}
              onPending={() => onPending(child.href)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
