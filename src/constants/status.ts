/**
 * Record status shared by every master entity. Mirrored as a Prisma enum in
 * Phase 2 so the database and the application agree on the allowed values.
 */
export const RECORD_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

export type RecordStatus = (typeof RECORD_STATUS)[keyof typeof RECORD_STATUS];

export const RECORD_STATUS_LABELS: Readonly<Record<RecordStatus, string>> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

export const RECORD_STATUS_OPTIONS: readonly { value: RecordStatus; label: string }[] = [
  { value: RECORD_STATUS.ACTIVE, label: RECORD_STATUS_LABELS.ACTIVE },
  { value: RECORD_STATUS.INACTIVE, label: RECORD_STATUS_LABELS.INACTIVE },
];

/**
 * Seeded role slugs. Slugs are stable identifiers for code and seeds; the
 * display name stays editable by administrators.
 */
export const ROLE_SLUGS = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MANAGER: "manager",
  EMPLOYEE: "employee",
  VIEWER: "viewer",
} as const;

export type RoleSlug = (typeof ROLE_SLUGS)[keyof typeof ROLE_SLUGS];

export const BRANCH_TYPES = {
  HEAD_OFFICE: "HEAD_OFFICE",
  REGIONAL_OFFICE: "REGIONAL_OFFICE",
  WAREHOUSE: "WAREHOUSE",
  RETAIL_OUTLET: "RETAIL_OUTLET",
  FACTORY: "FACTORY",
} as const;

export type BranchType = (typeof BRANCH_TYPES)[keyof typeof BRANCH_TYPES];

export const BRANCH_TYPE_LABELS: Readonly<Record<BranchType, string>> = {
  HEAD_OFFICE: "Head Office",
  REGIONAL_OFFICE: "Regional Office",
  WAREHOUSE: "Warehouse",
  RETAIL_OUTLET: "Retail Outlet",
  FACTORY: "Factory",
};

export const BRANCH_TYPE_VALUES = [
  BRANCH_TYPES.HEAD_OFFICE,
  BRANCH_TYPES.REGIONAL_OFFICE,
  BRANCH_TYPES.WAREHOUSE,
  BRANCH_TYPES.RETAIL_OUTLET,
  BRANCH_TYPES.FACTORY,
] as const satisfies readonly BranchType[];

export const BRANCH_TYPE_OPTIONS: readonly { value: BranchType; label: string }[] =
  BRANCH_TYPE_VALUES.map((value) => ({ value, label: BRANCH_TYPE_LABELS[value] }));

export const RECORD_STATUS_VALUES = [
  RECORD_STATUS.ACTIVE,
  RECORD_STATUS.INACTIVE,
] as const satisfies readonly RecordStatus[];

export const AUDIT_ACTIONS = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  ACTIVATE: "ACTIVATE",
  DEACTIVATE: "DEACTIVATE",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  LOGIN_FAILED: "LOGIN_FAILED",
  PASSWORD_RESET_REQUESTED: "PASSWORD_RESET_REQUESTED",
  PASSWORD_RESET_COMPLETED: "PASSWORD_RESET_COMPLETED",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  PERMISSIONS_UPDATED: "PERMISSIONS_UPDATED",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export const AUDIT_ACTION_LABELS: Readonly<Record<AuditAction, string>> = {
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
  ACTIVATE: "Activated",
  DEACTIVATE: "Deactivated",
  LOGIN: "Signed in",
  LOGOUT: "Signed out",
  LOGIN_FAILED: "Sign-in failed",
  PASSWORD_RESET_REQUESTED: "Password reset requested",
  PASSWORD_RESET_COMPLETED: "Password reset completed",
  PASSWORD_CHANGED: "Password changed",
  PERMISSIONS_UPDATED: "Permissions updated",
};

export const AUDIT_ACTION_VALUES = [
  AUDIT_ACTIONS.CREATE,
  AUDIT_ACTIONS.UPDATE,
  AUDIT_ACTIONS.DELETE,
  AUDIT_ACTIONS.ACTIVATE,
  AUDIT_ACTIONS.DEACTIVATE,
  AUDIT_ACTIONS.LOGIN,
  AUDIT_ACTIONS.LOGOUT,
  AUDIT_ACTIONS.LOGIN_FAILED,
  AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
  AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
  AUDIT_ACTIONS.PASSWORD_CHANGED,
  AUDIT_ACTIONS.PERMISSIONS_UPDATED,
] as const satisfies readonly AuditAction[];

export const AUDIT_ACTION_OPTIONS: readonly { value: AuditAction; label: string }[] =
  AUDIT_ACTION_VALUES.map((value) => ({
    value,
    label: AUDIT_ACTION_LABELS[value],
  }));
