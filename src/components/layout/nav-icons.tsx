import {
  BriefcaseIcon,
  BuildingIcon,
  LandmarkIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  UserCogIcon,
  UserIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

import type { NavIconName } from "@/constants/navigation";

/**
 * Icons are resolved here so `constants/navigation` stays a pure data module and
 * only the icons actually used are pulled into the bundle.
 */
export const NAV_ICONS: Readonly<Record<NavIconName, LucideIcon>> = {
  dashboard: LayoutDashboardIcon,
  administration: BriefcaseIcon,
  users: UsersIcon,
  roles: UserCogIcon,
  permissions: ShieldCheckIcon,
  branches: BuildingIcon,
  entity: LandmarkIcon,
  settings: SettingsIcon,
  "general-settings": SlidersHorizontalIcon,
  profile: UserIcon,
  "audit-logs": ClipboardListIcon,
};
