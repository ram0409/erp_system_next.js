import { PERMISSIONS, type PermissionKey } from "@/constants/permissions";
import { ROLE_SLUGS, type RoleSlug } from "@/constants/status";

/**
 * Default grants applied by the seed. `null` means the entire catalog — used for
 * Super Admin so new ERP modules are covered on the next seed without editing
 * this file. Every other role is an explicit allow-list: a key that is not here
 * is not granted, even if it exists in the catalog.
 *
 * These defaults are applied only when the grant row is created. Re-seeding does
 * not revoke or add grants on roles an administrator has already edited.
 */
export const SEEDED_ROLE_GRANTS: Readonly<Record<RoleSlug, readonly PermissionKey[] | null>> = {
  [ROLE_SLUGS.SUPER_ADMIN]: null,
  [ROLE_SLUGS.ADMIN]: [
    PERMISSIONS.DASHBOARD.VIEW,
    PERMISSIONS.USERS.VIEW,
    PERMISSIONS.USERS.CREATE,
    PERMISSIONS.USERS.EDIT,
    PERMISSIONS.USERS.DELETE,
    PERMISSIONS.USERS.EXPORT,
    PERMISSIONS.ROLES.VIEW,
    PERMISSIONS.ROLES.CREATE,
    PERMISSIONS.ROLES.EDIT,
    PERMISSIONS.BRANCHES.VIEW,
    PERMISSIONS.BRANCHES.CREATE,
    PERMISSIONS.BRANCHES.EDIT,
    PERMISSIONS.BRANCHES.DELETE,
    PERMISSIONS.BRANCHES.EXPORT,
    PERMISSIONS.ROLE_PERMISSIONS.VIEW,
    PERMISSIONS.SETTINGS.VIEW,
    PERMISSIONS.SETTINGS.EDIT,
    PERMISSIONS.AUDIT_LOGS.VIEW,
  ],
  [ROLE_SLUGS.MANAGER]: [
    PERMISSIONS.DASHBOARD.VIEW,
    PERMISSIONS.USERS.VIEW,
    PERMISSIONS.USERS.CREATE,
    PERMISSIONS.USERS.EDIT,
    PERMISSIONS.USERS.EXPORT,
    PERMISSIONS.ROLES.VIEW,
    PERMISSIONS.BRANCHES.VIEW,
    PERMISSIONS.BRANCHES.EXPORT,
    PERMISSIONS.ROLE_PERMISSIONS.VIEW,
    PERMISSIONS.SETTINGS.VIEW,
    PERMISSIONS.AUDIT_LOGS.VIEW,
  ],
  [ROLE_SLUGS.EMPLOYEE]: [
    PERMISSIONS.DASHBOARD.VIEW,
    PERMISSIONS.USERS.VIEW,
    PERMISSIONS.BRANCHES.VIEW,
  ],
  [ROLE_SLUGS.VIEWER]: [
    PERMISSIONS.DASHBOARD.VIEW,
    PERMISSIONS.USERS.VIEW,
    PERMISSIONS.ROLES.VIEW,
    PERMISSIONS.BRANCHES.VIEW,
    PERMISSIONS.AUDIT_LOGS.VIEW,
  ],
};
