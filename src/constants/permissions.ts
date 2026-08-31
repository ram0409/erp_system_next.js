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
  ROLE_PERMISSIONS: "role_permissions",
  BRANCHES: "branches",
  SETTINGS: "settings",
  AUDIT_LOGS: "audit_logs",
} as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[keyof typeof PERMISSION_MODULES];

/** Sidebar-aligned groups. The matrix nests catalog modules under these. */
export const PERMISSION_GROUPS = {
  DASHBOARD: "dashboard",
  ADMINISTRATION: "administration",
  SETTINGS: "settings",
} as const;

export type PermissionGroupId = (typeof PERMISSION_GROUPS)[keyof typeof PERMISSION_GROUPS];

export const PERMISSION_GROUP_ORDER = [
  PERMISSION_GROUPS.DASHBOARD,
  PERMISSION_GROUPS.ADMINISTRATION,
  PERMISSION_GROUPS.SETTINGS,
] as const satisfies readonly PermissionGroupId[];

export const PERMISSION_GROUP_LABELS: Readonly<Record<PermissionGroupId, string>> = {
  dashboard: "Dashboard",
  administration: "Administration",
  settings: "Settings",
};

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

export function buildPermissionKey<M extends PermissionModule, A extends PermissionAction>(
  module: M,
  action: A,
): `${M}${typeof PERMISSION_KEY_SEPARATOR}${A}` {
  return `${module}${PERMISSION_KEY_SEPARATOR}${action}`;
}

export function parsePermissionKey(key: string): { module: string; action: string } | null {
  const [module, action, ...rest] = key.split(PERMISSION_KEY_SEPARATOR);
  if (!module || !action || rest.length > 0) {
    return null;
  }
  return { module, action };
}

/** Typed references used by guards and pages: PERMISSIONS.USERS.CREATE */
export const PERMISSIONS = {
  DASHBOARD: {
    VIEW: buildPermissionKey(PERMISSION_MODULES.DASHBOARD, PERMISSION_ACTIONS.VIEW),
  },
  USERS: {
    VIEW: buildPermissionKey(PERMISSION_MODULES.USERS, PERMISSION_ACTIONS.VIEW),
    CREATE: buildPermissionKey(PERMISSION_MODULES.USERS, PERMISSION_ACTIONS.CREATE),
    EDIT: buildPermissionKey(PERMISSION_MODULES.USERS, PERMISSION_ACTIONS.EDIT),
    DELETE: buildPermissionKey(PERMISSION_MODULES.USERS, PERMISSION_ACTIONS.DELETE),
    EXPORT: buildPermissionKey(PERMISSION_MODULES.USERS, PERMISSION_ACTIONS.EXPORT),
  },
  ROLES: {
    VIEW: buildPermissionKey(PERMISSION_MODULES.ROLES, PERMISSION_ACTIONS.VIEW),
    CREATE: buildPermissionKey(PERMISSION_MODULES.ROLES, PERMISSION_ACTIONS.CREATE),
    EDIT: buildPermissionKey(PERMISSION_MODULES.ROLES, PERMISSION_ACTIONS.EDIT),
    DELETE: buildPermissionKey(PERMISSION_MODULES.ROLES, PERMISSION_ACTIONS.DELETE),
  },
  ROLE_PERMISSIONS: {
    VIEW: buildPermissionKey(PERMISSION_MODULES.ROLE_PERMISSIONS, PERMISSION_ACTIONS.VIEW),
    EDIT: buildPermissionKey(PERMISSION_MODULES.ROLE_PERMISSIONS, PERMISSION_ACTIONS.EDIT),
  },
  BRANCHES: {
    VIEW: buildPermissionKey(PERMISSION_MODULES.BRANCHES, PERMISSION_ACTIONS.VIEW),
    CREATE: buildPermissionKey(PERMISSION_MODULES.BRANCHES, PERMISSION_ACTIONS.CREATE),
    EDIT: buildPermissionKey(PERMISSION_MODULES.BRANCHES, PERMISSION_ACTIONS.EDIT),
    DELETE: buildPermissionKey(PERMISSION_MODULES.BRANCHES, PERMISSION_ACTIONS.DELETE),
    EXPORT: buildPermissionKey(PERMISSION_MODULES.BRANCHES, PERMISSION_ACTIONS.EXPORT),
  },
  SETTINGS: {
    VIEW: buildPermissionKey(PERMISSION_MODULES.SETTINGS, PERMISSION_ACTIONS.VIEW),
    EDIT: buildPermissionKey(PERMISSION_MODULES.SETTINGS, PERMISSION_ACTIONS.EDIT),
  },
  AUDIT_LOGS: {
    VIEW: buildPermissionKey(PERMISSION_MODULES.AUDIT_LOGS, PERMISSION_ACTIONS.VIEW),
  },
} as const;

type ValueOf<T> = T[keyof T];

export type PermissionKey = ValueOf<{
  [M in keyof typeof PERMISSIONS]: ValueOf<(typeof PERMISSIONS)[M]>;
}>;

export interface PermissionModuleDefinition {
  /** Stable database key. Never rename without a migration. */
  readonly module: PermissionModule;
  /** Parent group in the Role Permissions matrix, matching the sidebar. */
  readonly group: PermissionGroupId;
  /** Human label shown in the permission matrix. */
  readonly label: string;
  readonly description: string;
  /** Order the module appears in the matrix within its group. */
  readonly order: number;
  readonly actions: readonly PermissionAction[];
}

function actionsFromGroup(group: Record<string, string>): readonly PermissionAction[] {
  const allowed = new Set<string>(Object.values(PERMISSION_ACTIONS));
  return Object.values(group).map((key) => {
    const parsed = parsePermissionKey(key);
    if (!parsed || !allowed.has(parsed.action)) {
      throw new Error(`PERMISSIONS contains an invalid key "${key}".`);
    }
    return parsed.action as PermissionAction;
  });
}

export const PERMISSION_CATALOG: readonly PermissionModuleDefinition[] = [
  {
    module: PERMISSION_MODULES.DASHBOARD,
    group: PERMISSION_GROUPS.DASHBOARD,
    label: "Dashboard",
    description: "Access the dashboard and its summary metrics",
    order: 1,
    actions: actionsFromGroup(PERMISSIONS.DASHBOARD),
  },
  {
    module: PERMISSION_MODULES.BRANCHES,
    group: PERMISSION_GROUPS.ADMINISTRATION,
    label: "Branches",
    description: "Manage branch records and their operating status",
    order: 1,
    actions: actionsFromGroup(PERMISSIONS.BRANCHES),
  },
  {
    module: PERMISSION_MODULES.USERS,
    group: PERMISSION_GROUPS.ADMINISTRATION,
    label: "Users",
    description: "Manage user accounts, their branch and role assignments",
    order: 2,
    actions: actionsFromGroup(PERMISSIONS.USERS),
  },
  {
    module: PERMISSION_MODULES.ROLES,
    group: PERMISSION_GROUPS.ADMINISTRATION,
    label: "Roles",
    description: "Manage the role master",
    order: 3,
    actions: actionsFromGroup(PERMISSIONS.ROLES),
  },
  {
    module: PERMISSION_MODULES.ROLE_PERMISSIONS,
    group: PERMISSION_GROUPS.ADMINISTRATION,
    label: "Role Permissions",
    description: "Grant or revoke module permissions for a role",
    order: 4,
    actions: actionsFromGroup(PERMISSIONS.ROLE_PERMISSIONS),
  },
  {
    module: PERMISSION_MODULES.SETTINGS,
    group: PERMISSION_GROUPS.SETTINGS,
    label: "General & Company Details",
    description: "Theme, accent colour, company identity and logo",
    order: 1,
    actions: actionsFromGroup(PERMISSIONS.SETTINGS),
  },
  {
    module: PERMISSION_MODULES.AUDIT_LOGS,
    group: PERMISSION_GROUPS.SETTINGS,
    label: "Audit Logs",
    description: "Review the audit trail of administrative activity",
    order: 2,
    actions: actionsFromGroup(PERMISSIONS.AUDIT_LOGS),
  },
];

export interface PermissionCatalogGroup {
  readonly groupId: PermissionGroupId;
  readonly label: string;
  readonly modules: readonly PermissionModuleDefinition[];
}

/** Catalog nested as module → sub-module, in sidebar order. */
export function groupedPermissionCatalog(): readonly PermissionCatalogGroup[] {
  return PERMISSION_GROUP_ORDER.map((groupId) => ({
    groupId,
    label: PERMISSION_GROUP_LABELS[groupId],
    modules: PERMISSION_CATALOG.filter((definition) => definition.group === groupId).sort(
      (left, right) => left.order - right.order,
    ),
  })).filter((group) => group.modules.length > 0);
}

export const PERMISSION_ACTION_LABELS: Readonly<Record<PermissionAction, string>> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  approve: "Approve",
  export: "Export",
  print: "Print",
};

/** Flattened catalog used by the database seed. */
export const ALL_PERMISSION_KEYS: readonly string[] = PERMISSION_CATALOG.flatMap((definition) =>
  definition.actions.map((action) => buildPermissionKey(definition.module, action)),
);

const PERMISSION_KEY_SET: ReadonlySet<string> = new Set(ALL_PERMISSION_KEYS);

/** True when `value` is a key the catalog (and therefore any guard) recognizes. */
export function isPermissionKey(value: string): value is PermissionKey {
  return PERMISSION_KEY_SET.has(value);
}

/**
 * Guards reference `PERMISSIONS.*` while the matrix and seed render
 * `PERMISSION_CATALOG`. A missing catalog row would mean a typed key no role
 * can be granted — fail at import, not in production.
 */
function typedPermissionKeys(): readonly string[] {
  return Object.values(PERMISSIONS).flatMap((group) => Object.values(group));
}

function assertCatalogMatchesTypedPermissions(): void {
  const typed = new Set(typedPermissionKeys());
  const groups = new Set<string>(PERMISSION_GROUP_ORDER);

  for (const key of typed) {
    if (!PERMISSION_KEY_SET.has(key)) {
      throw new Error(`PERMISSIONS includes "${key}" but PERMISSION_CATALOG does not.`);
    }
  }

  for (const key of ALL_PERMISSION_KEYS) {
    if (!typed.has(key)) {
      throw new Error(`PERMISSION_CATALOG includes "${key}" but PERMISSIONS does not.`);
    }
  }

  for (const definition of PERMISSION_CATALOG) {
    if (!groups.has(definition.group)) {
      throw new Error(
        `PERMISSION_CATALOG module "${definition.module}" uses unknown group "${definition.group}".`,
      );
    }
  }
}

assertCatalogMatchesTypedPermissions();
