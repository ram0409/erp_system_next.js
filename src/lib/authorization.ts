import type { PermissionKey } from "@/constants/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import type { ActorContext, PermissionSnapshot } from "@/types/session";

/**
 * Pure authorization policy. No database, no request context — which means every
 * rule in here is directly unit-testable and behaves identically whether it is
 * called from a server component, a server action or a route handler.
 */

/**
 * Super Admin resolves to true for any permission, including permissions that do
 * not exist yet. Future ERP modules are therefore covered on the day they ship,
 * without a backfill migration for the built-in administrator role.
 */
export function holdsPermission(
  isSuperAdmin: boolean,
  permissions: ReadonlySet<string>,
  permission: PermissionKey,
): boolean {
  if (isSuperAdmin) {
    return true;
  }
  return permissions.has(permission);
}

export function hasPermission(actor: ActorContext, permission: PermissionKey): boolean {
  return holdsPermission(actor.user.role.isSuperAdmin, actor.permissions, permission);
}

export function snapshotAllows(snapshot: PermissionSnapshot, permission: PermissionKey): boolean {
  if (snapshot.isSuperAdmin) {
    return true;
  }
  return snapshot.permissions.includes(permission);
}

export function toPermissionSnapshot(actor: ActorContext): PermissionSnapshot {
  return {
    isSuperAdmin: actor.user.role.isSuperAdmin,
    permissions: [...actor.permissions],
  };
}

export function hasAnyPermission(
  actor: ActorContext,
  permissions: readonly PermissionKey[],
): boolean {
  return permissions.some((permission) => hasPermission(actor, permission));
}

export function hasAllPermissions(
  actor: ActorContext,
  permissions: readonly PermissionKey[],
): boolean {
  return permissions.every((permission) => hasPermission(actor, permission));
}

/** Narrows a possibly-null actor, throwing the 401 case. */
export function requireActor(actor: ActorContext | null): ActorContext {
  if (!actor) {
    throw new UnauthorizedError();
  }
  return actor;
}

/**
 * The single authorization gate used by the action wrapper. Requiring *all*
 * listed permissions rather than any is the safer default.
 */
export function assertPermission(
  actor: ActorContext | null,
  permissions: PermissionKey | readonly PermissionKey[],
): ActorContext {
  const resolved = requireActor(actor);
  const required = Array.isArray(permissions) ? permissions : [permissions as PermissionKey];

  if (!hasAllPermissions(resolved, required)) {
    throw new ForbiddenError(undefined, {
      internalDetail: `user=${resolved.user.publicId} role=${resolved.user.role.slug} missing=${required
        .filter((permission) => !hasPermission(resolved, permission))
        .join(",")}`,
    });
  }

  return resolved;
}

/** Builds the permission predicate consumed by navigation filtering. */
export function permissionChecker(
  actor: ActorContext | null,
): (permission: PermissionKey) => boolean {
  if (!actor) {
    return () => false;
  }
  return (permission) => hasPermission(actor, permission);
}
