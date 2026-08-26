export const ROUTES = {
  HOME: "/",

  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",

  DASHBOARD: "/dashboard",

  ADMINISTRATION: "/administration",
  USERS: "/administration/users",
  ROLES: "/administration/roles",
  ROLE_PERMISSIONS: "/administration/role-permissions",
  BRANCHES: "/administration/branches",
  DEPARTMENTS: "/administration/departments",
  DESIGNATIONS: "/administration/designations",
  ORGANIZATION: "/administration/organization",

  HR: "/hr",
  EMPLOYEES: "/hr/employees",
  ATTENDANCE: "/hr/attendance",
  LEAVE: "/hr/leave",
  HOLIDAYS: "/hr/holidays",

  PROJECTS: "/projects",
  TASKS: "/tasks",
  WORKLOGS: "/worklogs",

  SETTINGS: "/settings",
  SETTINGS_GENERAL: "/settings/general",
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
  departments: "Departments",
  designations: "Designations",
  organization: "Organization",
  hr: "HR Management",
  employees: "Employees",
  attendance: "Attendance",
  leave: "Leave Management",
  holidays: "Holidays",
  projects: "Projects",
  tasks: "Tasks",
  worklogs: "Worklogs",
  settings: "Settings",
  general: "Company Information",
  "audit-logs": "Audit Logs",
  profile: "Profile",
  "change-password": "Change Password",
  new: "New",
  edit: "Edit",
};
