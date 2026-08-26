import "server-only";

import { cache } from "react";

import { RECORD_STATUS } from "@/constants/status";
import { getRequestIp } from "@/lib/request";
import { readSessionCookie } from "@/lib/session-cookie";
import { verifySessionToken } from "@/lib/session-token";
import { findActorByPublicId, toPermissionKeys } from "@/repositories/user-repository";
import type { ActorContext, SessionUser } from "@/types/session";

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

  let actor;
  try {
    actor = await findActorByPublicId(claims.userPublicId);
  } catch {
    // Unreachable Postgres (typical on Vercel with a localhost DATABASE_URL)
    // must not turn the login page into a 500 with no UI.
    return null;
  }
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
    designation: actor.designation,
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
  const token = await readSessionCookie();
  if (!token) {
    return false;
  }

  const claims = verifySessionToken(token);
  if (!claims) {
    return false;
  }

  const actor = await findActorByPublicId(claims.userPublicId);
  return actor?.mustChangePassword ?? false;
});
