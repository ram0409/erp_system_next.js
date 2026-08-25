import type { ReactNode } from "react";

import type { PermissionKey } from "@/constants/permissions";
import { hasAllPermissions } from "@/lib/authorization";
import { getActorContext } from "@/lib/session";

interface PermissionGateProps {
  permission: PermissionKey | readonly PermissionKey[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Hides UI the actor cannot use. This is a convenience for the interface only —
 * the matching server action performs the authoritative check, so removing this
 * component would never grant anyone extra access.
 */
export async function PermissionGate({
  permission,
  children,
  fallback = null,
}: PermissionGateProps) {
  const actor = await getActorContext();
  if (!actor) {
    return fallback;
  }

  const required = Array.isArray(permission) ? permission : [permission as PermissionKey];
  return hasAllPermissions(actor, required) ? children : fallback;
}
