import "server-only";

import { redirect } from "next/navigation";

import type { PermissionKey } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { hasAllPermissions } from "@/lib/authorization";
import { getActorContext } from "@/lib/session";
import type { ActorContext } from "@/types/session";

export type PageAccess =
  { readonly allowed: true; readonly actor: ActorContext } | { readonly allowed: false };

/**
 * Server-side gate for a page. Returns a result rather than throwing, because a
 * thrown error would be replaced by a generic digest in production and the user
 * would see "something went wrong" instead of "you do not have access".
 *
 * Missing session redirects to sign-in; missing permission renders the denial
 * state so the actor understands what happened without learning what the page
 * would have contained.
 */
export async function requirePageAccess(
  permission: PermissionKey | readonly PermissionKey[],
): Promise<PageAccess> {
  const actor = await getActorContext();

  if (!actor) {
    redirect(ROUTES.LOGIN);
  }

  const required = Array.isArray(permission) ? permission : [permission as PermissionKey];
  return hasAllPermissions(actor, required) ? { allowed: true, actor } : { allowed: false };
}
