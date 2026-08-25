"use client";

import type { ReactNode } from "react";

import { useCan } from "@/components/providers/permissions-provider";
import type { PermissionKey } from "@/constants/permissions";

interface CanProps {
  permission: PermissionKey | readonly PermissionKey[];
  /** Defaults to requiring every listed permission. */
  mode?: "all" | "any";
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Hides UI the actor cannot use. Presentation only: removing this wrapper would
 * never grant extra access, because every mutation still runs `defineAction`.
 */
export function Can({ permission, mode = "all", children, fallback = null }: CanProps) {
  return useCan(permission, mode) ? children : fallback;
}
