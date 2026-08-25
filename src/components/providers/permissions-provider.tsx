"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { PermissionKey } from "@/constants/permissions";
import { snapshotAllows } from "@/lib/authorization";
import type { PermissionSnapshot } from "@/types/session";

const PermissionsContext = createContext<PermissionSnapshot | null>(null);

export function PermissionsProvider({
  value,
  children,
}: {
  value: PermissionSnapshot;
  children: ReactNode;
}) {
  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissionSnapshot(): PermissionSnapshot {
  const snapshot = useContext(PermissionsContext);
  if (!snapshot) {
    throw new Error("usePermissionSnapshot must be used within PermissionsProvider");
  }
  return snapshot;
}

/**
 * Client-side convenience for hiding controls. The matching server action is
 * still the authorization boundary — this hook never grants access by itself.
 */
export function useCan(
  permission: PermissionKey | readonly PermissionKey[],
  mode: "all" | "any" = "all",
): boolean {
  const snapshot = usePermissionSnapshot();
  const required = Array.isArray(permission) ? permission : [permission as PermissionKey];

  if (mode === "any") {
    return required.some((key) => snapshotAllows(snapshot, key));
  }
  return required.every((key) => snapshotAllows(snapshot, key));
}
