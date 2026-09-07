import { ROLE_SLUGS } from "@/constants/status";
import { ForbiddenError } from "@/lib/errors";
import type { ActorContext } from "@/types/session";

function isAdminActor(actor: ActorContext): boolean {
  return (
    actor.user.role.isSuperAdmin ||
    actor.user.role.slug === ROLE_SLUGS.SUPER_ADMIN ||
    actor.user.role.slug === ROLE_SLUGS.ADMIN
  );
}

/** Organization Password policy / Inactive accounts — Admin and Super Admin only. */
export function canViewOrgSecurityPolicies(actor: ActorContext): boolean {
  return isAdminActor(actor);
}

/** Organization Password policy / Inactive accounts — Admin and Super Admin only. */
export function canEditOrgSecurityPolicies(actor: ActorContext): boolean {
  return isAdminActor(actor);
}

export function assertCanEditOrgSecurityPolicies(actor: ActorContext): ActorContext {
  if (!canEditOrgSecurityPolicies(actor)) {
    throw new ForbiddenError(undefined, {
      internalDetail: `user=${actor.user.publicId} role=${actor.user.role.slug} missing=admin-org-security`,
    });
  }
  return actor;
}
