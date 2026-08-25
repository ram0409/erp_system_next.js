import "server-only";

import { ERROR_MESSAGES, ROLE_PERMISSION_MESSAGES } from "@/constants/messages";
import {
  ALL_PERMISSION_KEYS,
  PERMISSION_CATALOG,
  PERMISSIONS,
  isPermissionKey,
  type PermissionKey,
  type PermissionModuleDefinition,
} from "@/constants/permissions";
import { AUDIT_ACTIONS } from "@/constants/status";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import * as auditRepository from "@/repositories/audit-repository";
import * as permissionRepository from "@/repositories/permission-repository";
import * as roleRepository from "@/repositories/role-repository";
import type { PermissionMatrixData } from "@/types/role-permissions";
import type { ActorContext } from "@/types/session";
import { formatFullName } from "@/utils/format";
import type { Prisma } from "@generated/prisma/client";

/**
 * The catalog constants are the source of truth for what can be granted. The
 * database copy exists so the Role Permission matrix can join on integer ids.
 * Unknown keys posted by the client are dropped, never inserted.
 */

export function getCatalog(): readonly PermissionModuleDefinition[] {
  return PERMISSION_CATALOG;
}

export function listStoredCatalog() {
  return permissionRepository.listCatalog();
}

export function resolvePermissionIds(keys: readonly string[]) {
  return permissionRepository.findIdsByKeys(keys);
}

function toPermissionKeys(keys: readonly string[]): PermissionKey[] {
  const unique: PermissionKey[] = [];
  const seen = new Set<string>();

  for (const key of keys) {
    if (!isPermissionKey(key) || seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(key);
  }

  return unique;
}

function keepsOwnMatrixAccess(keys: readonly PermissionKey[]): boolean {
  return (
    keys.includes(PERMISSIONS.ROLE_PERMISSIONS.VIEW) &&
    keys.includes(PERMISSIONS.ROLE_PERMISSIONS.EDIT)
  );
}

export async function getMatrix(rolePublicId?: string | undefined): Promise<PermissionMatrixData> {
  const roles = await roleRepository.listForMatrix();
  const selected =
    (rolePublicId ? roles.find((role) => role.publicId === rolePublicId) : undefined) ??
    roles[0] ??
    null;

  if (!selected) {
    return { roles, selected: null, grantedKeys: [], readOnly: true };
  }

  const row = await roleRepository.findByPublicId(selected.publicId);
  if (!row) {
    return { roles, selected, grantedKeys: [], readOnly: selected.isSuperAdmin };
  }

  const grantedKeys = toPermissionKeys(
    row.isSuperAdmin ? ALL_PERMISSION_KEYS : await roleRepository.findGrantedKeys(row.id),
  );

  return {
    roles,
    selected,
    grantedKeys,
    readOnly: row.isSuperAdmin,
  };
}

interface AuditMeta {
  readonly userAgent?: string | null;
}

export async function saveRolePermissions(
  rolePublicId: string,
  submittedKeys: readonly string[],
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<{ grantedKeys: readonly PermissionKey[] }> {
  const role = await roleRepository.findByPublicId(rolePublicId);
  if (!role) {
    throw new NotFoundError(ERROR_MESSAGES.NOT_FOUND);
  }

  if (role.isSuperAdmin) {
    throw new ForbiddenError(ROLE_PERMISSION_MESSAGES.SUPER_ADMIN_LOCKED);
  }

  const nextKeys = toPermissionKeys(submittedKeys);

  if (
    actor.roleId === role.id &&
    !actor.user.role.isSuperAdmin &&
    !keepsOwnMatrixAccess(nextKeys)
  ) {
    throw new ForbiddenError(ROLE_PERMISSION_MESSAGES.OWN_ROLE_EDIT);
  }

  const previousKeys = toPermissionKeys(await roleRepository.findGrantedKeys(role.id));
  const previousSet = new Set(previousKeys);
  const nextSet = new Set(nextKeys);
  const granted = nextKeys.filter((key) => !previousSet.has(key));
  const revoked = previousKeys.filter((key) => !nextSet.has(key));

  const permissionIds = await resolvePermissionIds(nextKeys);
  await roleRepository.replacePermissions(role.id, permissionIds);

  await auditRepository.record({
    action: AUDIT_ACTIONS.PERMISSIONS_UPDATED,
    actorUserId: actor.userId,
    actorEmail: actor.user.email,
    actorName: formatFullName(actor.user.firstName, actor.user.lastName),
    entityType: "Role",
    entityId: role.id,
    entityPublicId: role.publicId,
    summary: `Updated permissions for ${role.name}`,
    changes: { granted, revoked, total: nextKeys.length } as Prisma.InputJsonValue,
    ipAddress: actor.ipAddress,
    userAgent: meta.userAgent ?? null,
  });

  return { grantedKeys: nextKeys };
}
