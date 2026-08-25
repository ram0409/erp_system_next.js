/**
 * The permission catalog is the single source of truth for what the application
 * can authorize. The database is seeded from it and the Role Permission matrix
 * renders from it, so adding a future ERP module means editing this file and
 * re-running the seed — no schema change, no page-level permission strings.
 */

export const PERMISSION_KEY_SEPARATOR = ":" as const;

export const PERMISSION_MODULES = {
  DASHBOARD: "dashboard",
  USERS: "users",
  ROLES: "roles",
  BRANCHES: "branches",
  ROLE_PERMISSIONS: "role_permissions",
  SETTINGS: "settings",
  AUDIT_LOGS: "audit_logs",
} as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[keyof typeof PERMISSION_MODULES];

export const PERMISSION_ACTIONS = {
  VIEW: "view",
  CREATE: "create",
  EDIT: "edit",
  DELETE: "delete",
  APPROVE: "approve",
  EXPORT: "export",
  PRINT: "print",
} as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[keyof typeof PERMISSION_ACTIONS];

/** Typed references used by guards and pages: PERMISSIONS.USERS.CREATE */
export const PERMISSIONS = {
  DASHBOARD: {
    VIEW: "dashboard:view",
  },
  USERS: {
    VIEW: "users:view",
    CREATE: "users:create",
    EDIT: "users:edit",
    DELETE: "users:delete",
    EXPORT: "users:export",
  },
  ROLES: {
    VIEW: "roles:view",
    CREATE: "roles:create",
    EDIT: "roles:edit",
    DELETE: "roles:delete",
  },
  BRANCHES: {
    VIEW: "branches:view",
    CREATE: "branches:create",
    EDIT: "branches:edit",
    DELETE: "branches:delete",
    EXPORT: "branches:export",
  },
  ROLE_PERMISSIONS: {
    VIEW: "role_permissions:view",
    EDIT: "role_permissions:edit",
  },
  SETTINGS: {
    VIEW: "settings:view",
    EDIT: "settings:edit",
  },
  AUDIT_LOGS: {
    VIEW: "audit_logs:view",
  },
} as const;

type ValueOf<T> = T[keyof T];

export type PermissionKey = ValueOf<{
  [M in keyof typeof PERMISSIONS]: ValueOf<(typeof PERMISSIONS)[M]>;
}>;

export interface PermissionModuleDefinition {
  /** Stable database key. Never rename without a migration. */
  readonly module: PermissionModule;
  /** Human label shown in the permission matrix. */
  readonly label: string;
  readonly description: string;
  /** Order the module appears in the matrix. */
  readonly order: number;
  readonly actions: readonly PermissionAction[];
}

export const PERMISSION_CATALOG: readonly PermissionModuleDefinition[] = [
  {
    module: PERMISSION_MODULES.DASHBOARD,
    label: "Dashboard",
    description: "Access the dashboard and its summary metrics",
    order: 1,
    actions: [PERMISSION_ACTIONS.VIEW],
  },
  {
    module: PERMISSION_MODULES.USERS,
    label: "Users",
    description: "Manage user accounts, their branch and role assignments",
    order: 2,
    actions: [
      PERMISSION_ACTIONS.VIEW,
      PERMISSION_ACTIONS.CREATE,
      PERMISSION_ACTIONS.EDIT,
      PERMISSION_ACTIONS.DELETE,
      PERMISSION_ACTIONS.EXPORT,
    ],
  },
  {
    module: PERMISSION_MODULES.ROLES,
    label: "Roles",
    description: "Manage the role master",
    order: 3,
    actions: [
      PERMISSION_ACTIONS.VIEW,
      PERMISSION_ACTIONS.CREATE,
      PERMISSION_ACTIONS.EDIT,
      PERMISSION_ACTIONS.DELETE,
    ],
  },
  {
    module: PERMISSION_MODULES.BRANCHES,
    label: "Branches",
    description: "Manage branch records and their operating status",
    order: 4,
    actions: [
      PERMISSION_ACTIONS.VIEW,
      PERMISSION_ACTIONS.CREATE,
      PERMISSION_ACTIONS.EDIT,
      PERMISSION_ACTIONS.DELETE,
      PERMISSION_ACTIONS.EXPORT,
    ],
  },
  {
    module: PERMISSION_MODULES.ROLE_PERMISSIONS,
    label: "Role Permissions",
    description: "Grant or revoke module permissions for a role",
    order: 5,
    actions: [PERMISSION_ACTIONS.VIEW, PERMISSION_ACTIONS.EDIT],
  },
  {
    module: PERMISSION_MODULES.SETTINGS,
    label: "Settings",
    description: "View and update organisation settings",
    order: 6,
    actions: [PERMISSION_ACTIONS.VIEW, PERMISSION_ACTIONS.EDIT],
  },
  {
    module: PERMISSION_MODULES.AUDIT_LOGS,
    label: "Audit Logs",
    description: "Review the audit trail of administrative activity",
    order: 7,
    actions: [PERMISSION_ACTIONS.VIEW],
  },
];

export const PERMISSION_ACTION_LABELS: Readonly<Record<PermissionAction, string>> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  approve: "Approve",
  export: "Export",
  print: "Print",
};

export function buildPermissionKey(module: PermissionModule, action: PermissionAction): string {
  return `${module}${PERMISSION_KEY_SEPARATOR}${action}`;
}

export function parsePermissionKey(key: string): { module: string; action: string } | null {
  const [module, action, ...rest] = key.split(PERMISSION_KEY_SEPARATOR);
  if (!module || !action || rest.length > 0) {
    return null;
  }
  return { module, action };
}

/** Flattened catalog used by the database seed. */
export const ALL_PERMISSION_KEYS: readonly string[] = PERMISSION_CATALOG.flatMap((definition) =>
  definition.actions.map((action) => buildPermissionKey(definition.module, action)),
);

const PERMISSION_KEY_SET: ReadonlySet<string> = new Set(ALL_PERMISSION_KEYS);

/** True when `value` is a key the catalog (and therefore any guard) recognizes. */
export function isPermissionKey(value: string): value is PermissionKey {
  return PERMISSION_KEY_SET.has(value);
}
