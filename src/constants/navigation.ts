import { PERMISSIONS, type PermissionKey } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

/**
 * The sidebar is data, not markup. Adding a future ERP module is one entry here:
 * it is automatically permission-filtered, highlighted on the active route and
 * reflected in the breadcrumb trail.
 *
 * Icons are referenced by name and resolved by the sidebar so this module stays
 * free of React and can be imported by server code without pulling in an icon set.
 */
export type NavIconName =
  | "dashboard"
  | "administration"
  | "users"
  | "roles"
  | "permissions"
  | "branches"
  | "departments"
  | "designations"
  | "hr"
  | "employees"
  | "attendance"
  | "leave"
  | "holidays"
  | "projects"
  | "tasks"
  | "worklogs"
  | "settings"
  | "general-settings"
  | "profile"
  | "audit-logs";

export interface NavLeaf {
  readonly kind: "link";
  readonly label: string;
  readonly href: string;
  readonly icon: NavIconName;
  /**
   * When omitted, the link is shown to every signed-in user. Used for own-account
   * screens such as Profile that are not gated by a module permission.
   */
  readonly permission?: PermissionKey;
}

export interface NavGroup {
  readonly kind: "group";
  readonly id: string;
  readonly label: string;
  readonly icon: NavIconName;
  readonly children: readonly NavLeaf[];
}

export type NavItem = NavLeaf | NavGroup;

export const NAVIGATION: readonly NavItem[] = [
  {
    kind: "link",
    label: "Dashboard",
    href: ROUTES.DASHBOARD,
    icon: "dashboard",
    permission: PERMISSIONS.DASHBOARD.VIEW,
  },
  {
    kind: "group",
    id: "administration",
    label: "Administration",
    icon: "administration",
    children: [
      {
        kind: "link",
        label: "Users",
        href: ROUTES.USERS,
        icon: "users",
        permission: PERMISSIONS.USERS.VIEW,
      },
      {
        kind: "link",
        label: "Roles",
        href: ROUTES.ROLES,
        icon: "roles",
        permission: PERMISSIONS.ROLES.VIEW,
      },
      {
        kind: "link",
        label: "Role Permissions",
        href: ROUTES.ROLE_PERMISSIONS,
        icon: "permissions",
        permission: PERMISSIONS.ROLE_PERMISSIONS.VIEW,
      },
      {
        kind: "link",
        label: "Branches",
        href: ROUTES.BRANCHES,
        icon: "branches",
        permission: PERMISSIONS.BRANCHES.VIEW,
      },
      {
        kind: "link",
        label: "Departments",
        href: ROUTES.DEPARTMENTS,
        icon: "departments",
        permission: PERMISSIONS.DEPARTMENTS.VIEW,
      },
      {
        kind: "link",
        label: "Designations",
        href: ROUTES.DESIGNATIONS,
        icon: "designations",
        permission: PERMISSIONS.DESIGNATIONS.VIEW,
      },
    ],
  },
  {
    kind: "group",
    id: "hr",
    label: "HR Management",
    icon: "hr",
    children: [
      {
        kind: "link",
        label: "Employees",
        href: ROUTES.EMPLOYEES,
        icon: "employees",
        permission: PERMISSIONS.EMPLOYEES.VIEW,
      },
      {
        kind: "link",
        label: "Attendance",
        href: ROUTES.ATTENDANCE,
        icon: "attendance",
        permission: PERMISSIONS.ATTENDANCE.VIEW,
      },
      {
        kind: "link",
        label: "Leave Management",
        href: ROUTES.LEAVE,
        icon: "leave",
        permission: PERMISSIONS.LEAVE.VIEW,
      },
      {
        kind: "link",
        label: "Holidays",
        href: ROUTES.HOLIDAYS,
        icon: "holidays",
        permission: PERMISSIONS.HOLIDAYS.VIEW,
      },
    ],
  },
  {
    kind: "group",
    id: "projects",
    label: "Projects",
    icon: "projects",
    children: [
      {
        kind: "link",
        label: "Projects",
        href: ROUTES.PROJECTS,
        icon: "projects",
        permission: PERMISSIONS.PROJECTS.VIEW,
      },
      {
        kind: "link",
        label: "Tasks",
        href: ROUTES.TASKS,
        icon: "tasks",
        permission: PERMISSIONS.TASKS.VIEW,
      },
      {
        kind: "link",
        label: "Worklogs",
        href: ROUTES.WORKLOGS,
        icon: "worklogs",
        permission: PERMISSIONS.WORKLOGS.VIEW,
      },
    ],
  },
  {
    kind: "group",
    id: "settings",
    label: "Settings",
    icon: "settings",
    children: [
      {
        kind: "link",
        label: "Company Information",
        href: ROUTES.SETTINGS_GENERAL,
        icon: "general-settings",
        permission: PERMISSIONS.SETTINGS.VIEW,
      },
      {
        kind: "link",
        label: "Profile",
        href: ROUTES.PROFILE,
        icon: "profile",
      },
      {
        kind: "link",
        label: "Audit Logs",
        href: ROUTES.SETTINGS_AUDIT_LOGS,
        icon: "audit-logs",
        permission: PERMISSIONS.AUDIT_LOGS.VIEW,
      },
    ],
  },
];

function canSeeLeaf(leaf: NavLeaf, can: (permission: PermissionKey) => boolean): boolean {
  return leaf.permission === undefined || can(leaf.permission);
}

/**
 * Removes links the actor cannot access, then drops groups left empty.
 * The server renders the sidebar, so an unauthorized link is never sent to the
 * browser at all — this is presentation only, not the authorization boundary.
 */
export function filterNavigation(
  items: readonly NavItem[],
  can: (permission: PermissionKey) => boolean,
): NavItem[] {
  const result: NavItem[] = [];

  for (const item of items) {
    if (item.kind === "link") {
      if (canSeeLeaf(item, can)) {
        result.push(item);
      }
      continue;
    }

    const children = item.children.filter((child) => canSeeLeaf(child, can));
    if (children.length > 0) {
      result.push({ ...item, children });
    }
  }

  return result;
}

/**
 * First child in a navigation group the actor can open. Group hubs such as
 * `/administration` and `/settings` are not screens of their own.
 */
export function firstAccessibleGroupHref(
  groupId: string,
  can: (permission: PermissionKey) => boolean,
): string | null {
  const group = NAVIGATION.find(
    (item): item is NavGroup => item.kind === "group" && item.id === groupId,
  );

  if (!group) {
    return null;
  }

  return group.children.find((child) => canSeeLeaf(child, can))?.href ?? null;
}

/**
 * First Administration child the actor can open. `/administration` itself is not
 * a screen, so the hub must land on a permitted child rather than always Users
 * (which would 403 a viewer who only has Branches).
 */
export function firstAccessibleAdminHref(
  can: (permission: PermissionKey) => boolean,
): string | null {
  return firstAccessibleGroupHref("administration", can);
}
