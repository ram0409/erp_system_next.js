import type { RecordStatus } from "@/constants/status";

/**
 * Client-safe role projections. Internal numeric ids stay in the repository;
 * listings and forms only ever see `publicId`.
 */

export interface RoleListItem {
  readonly publicId: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly isSystem: boolean;
  readonly isSuperAdmin: boolean;
  readonly status: RecordStatus;
  readonly createdAt: string;
  readonly userCount: number;
  readonly permissionCount: number;
}

export interface RoleDetail extends RoleListItem {
  readonly updatedAt: string;
}
