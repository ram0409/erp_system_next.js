import Link from "next/link";

import { NAV_ICONS } from "@/components/layout/nav-icons";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NavIconName, NavItem } from "@/constants/navigation";

interface DashboardMenuPanelProps {
  readonly items: readonly NavItem[];
}

export function DashboardMenuPanel({ items }: DashboardMenuPanelProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Menus</CardTitle>
        <p className="text-muted-foreground text-sm">The same modules as the sidebar.</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        {items.length === 0 ? (
          <EmptyState title="No other menus" className="py-6" />
        ) : (
          items.map((item) =>
            item.kind === "group" ? (
              <div key={item.id} className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {item.label}
                </p>
                <ul className="space-y-2">
                  {item.children.map((child) => (
                    <li key={child.href}>
                      <MenuLink href={child.href} label={child.label} icon={child.icon} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <MenuLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
            ),
          )
        )}
      </CardContent>
    </Card>
  );
}

function MenuLink({
  href,
  label,
  icon,
}: {
  readonly href: string;
  readonly label: string;
  readonly icon: NavIconName;
}) {
  const Icon = NAV_ICONS[icon];

  return (
    <Link
      href={href}
      className="hover:border-primary/40 focus-visible:ring-ring flex items-center gap-3 rounded-md border px-3 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <span className="bg-muted flex size-8 items-center justify-center rounded-md">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="text-foreground text-sm font-medium">{label}</span>
    </Link>
  );
}
