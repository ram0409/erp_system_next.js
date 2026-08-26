import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BuildingIcon,
  LandmarkIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  UserCogIcon,
  UserPlusIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import type { DashboardCapabilities } from "@/types/dashboard";

interface DashboardQuickActionsProps {
  readonly capabilities: DashboardCapabilities;
}

interface QuickAction {
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly show: boolean;
}

export function DashboardQuickActions({ capabilities }: DashboardQuickActionsProps) {
  const actions: QuickAction[] = [
    {
      href: ROUTES.USERS,
      label: "Add user",
      icon: UserPlusIcon,
      show: capabilities.users.create,
    },
    {
      href: ROUTES.ROLES,
      label: "Roles",
      icon: UserCogIcon,
      show: capabilities.roles.view,
    },
    {
      href: ROUTES.ROLE_PERMISSIONS,
      label: "Role permissions",
      icon: ShieldCheckIcon,
      show: capabilities.rolePermissions.view,
    },
    {
      href: ROUTES.BRANCHES,
      label: "Branches",
      icon: BuildingIcon,
      show: capabilities.branches.view,
    },
    {
      href: ROUTES.ENTITY,
      label: "Entity",
      icon: LandmarkIcon,
      show: capabilities.entities.view,
    },
    {
      href: ROUTES.SETTINGS_GENERAL,
      label: "Company information",
      icon: SlidersHorizontalIcon,
      show: capabilities.settings.view,
    },
  ].filter((action) => action.show);

  if (actions.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={action.href}
          variant="outline"
          size="sm"
          className="border-primary/20 bg-card/75 hover:border-primary/40 hover:bg-card"
          asChild
        >
          <Link href={action.href}>
            <action.icon />
            {action.label}
          </Link>
        </Button>
      ))}
    </section>
  );
}
