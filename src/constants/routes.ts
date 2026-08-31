export const ROUTES = {
  HOME: "/",

  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  VERIFY_TWO_FACTOR: "/verify-2fa",

  DASHBOARD: "/dashboard",

  ADMINISTRATION: "/administration",
  USERS: "/administration/users",
  ROLES: "/administration/roles",
  ROLE_PERMISSIONS: "/administration/role-permissions",
  BRANCHES: "/administration/branches",
  /** Compatibility redirect to Branches. Not a sidebar item. */
  ENTITY: "/administration/entity",
  /** Compatibility redirect to Company Details. Not a sidebar item. */
  ORGANIZATION: "/administration/organization",

  SETTINGS: "/settings",
  SETTINGS_GENERAL: "/settings/general",
  SETTINGS_COMPANY: "/settings/company",
  SETTINGS_SECURITY: "/settings/security",
  SETTINGS_AUDIT_LOGS: "/settings/audit-logs",

  PROFILE: "/profile",
  CHANGE_PASSWORD: "/profile/change-password",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

/** Where an authenticated user lands after login. */
export const DEFAULT_AUTHENTICATED_ROUTE = ROUTES.DASHBOARD;

/** Routes reachable without a session. */
export const PUBLIC_ROUTES: readonly string[] = [
  ROUTES.LOGIN,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
  ROUTES.VERIFY_TWO_FACTOR,
];

/**
 * Breadcrumb labels keyed by path segment. Segments absent from this map fall
 * back to a title-cased version of the segment itself.
 */
export const SEGMENT_LABELS: Readonly<Record<string, string>> = {
  dashboard: "Dashboard",
  administration: "Administration",
  users: "Users",
  roles: "Roles",
  "role-permissions": "Role Permissions",
  branches: "Branches",
  entity: "Entity",
  organization: "Organization",
  settings: "Settings",
  general: "General Settings",
  company: "Company Details",
  security: "Security",
  "audit-logs": "Audit Logs",
  profile: "Profile",
  "change-password": "Change Password",
  new: "New",
  edit: "Edit",
};
