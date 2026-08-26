import "server-only";

import { cache } from "react";

import { RECORD_STATUS } from "@/constants/status";
import { getRequestIp } from "@/lib/request";
import { readSessionCookie } from "@/lib/session-cookie";
import { verifySessionToken } from "@/lib/session-token";
import { findActorByPublicId, toPermissionKeys, type ActorRow } from "@/repositories/user-repository";
import type { ActorContext, SessionUser } from "@/types/session";

/**
 * One database read per request for the signed-in user. Shared by the layout's
 * actor context and the forced-password-change gate so a menu click does not
 * wait on the same query twice.
 */
const getActorRow = cache(async (): Promise<ActorRow | null> => {
  const token = await readSessionCookie();
  if (!token) {
    return null;
  }

  const claims = verifySessionToken(token);
  if (!claims) {
    return null;
  }

  return findActorByPublicId(claims.userPublicId);
});

/**
 * Resolves the actor for the current request.
 *
 * Wrapped in React `cache` so the layout, the page and any server action within a
 * single request share one database read, while never reusing a result across
 * requests.
 *
 * The cookie establishes *who* is asking; the database decides *what* they may
 * do, on every request. That is what makes deactivation, a role change or a
 * permission edit take effect immediately rather than at next sign-in — and it is
 * why the four checks below reject a cryptographically valid cookie.
 */
export const getActorContext = cache(async (): Promise<ActorContext | null> => {
  const token = await readSessionCookie();
  if (!token) {
    return null;
  }

  const claims = verifySessionToken(token);
  if (!claims) {
    return null;
  }

  const actor = await getActorRow();
  if (!actor) {
    return null;
  }

  // Password change, forced logout or account deletion bumps tokenVersion, which
  // invalidates every cookie issued before it.
  if (actor.tokenVersion !== claims.tokenVersion) {
    return null;
  }

  if (actor.status !== RECORD_STATUS.ACTIVE) {
    return null;
  }

  // A deactivated role or branch withdraws access without touching the user row.
  if (actor.role.status !== RECORD_STATUS.ACTIVE) {
    return null;
  }

  if (actor.branch.status !== RECORD_STATUS.ACTIVE || actor.branch.deletedAt !== null) {
    return null;
  }

  const user: SessionUser = {
    publicId: actor.publicId,
    employeeCode: actor.employeeCode,
    firstName: actor.firstName,
    lastName: actor.lastName,
    email: actor.email,
    designation: actor.designation?.name ?? null,
    avatarUrl: actor.avatarPath,
    status: actor.status,
    role: {
      publicId: actor.role.publicId,
      slug: actor.role.slug,
      name: actor.role.name,
      isSuperAdmin: actor.role.isSuperAdmin,
    },
    branch: {
      publicId: actor.branch.publicId,
      code: actor.branch.code,
      name: actor.branch.name,
    },
  };

  return {
    userId: actor.id,
    roleId: actor.roleId,
    branchId: actor.branchId,
    user,
    permissions: new Set(toPermissionKeys(actor)),
    ipAddress: await getRequestIp(),
  };
});

/**
 * Whether the actor must change their password before using the application.
 * Read separately from ActorContext because it gates routing rather than
 * authorization, and only the change-password flow needs it.
 */
export const requiresPasswordChange = cache(async (): Promise<boolean> => {
  const actor = await getActorRow();
  return actor?.mustChangePassword ?? false;
});
