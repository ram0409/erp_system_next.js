import type { PermissionKey } from "@/constants/permissions";
import type { RecordStatus } from "@/constants/status";

export interface MatrixRoleOption {
  readonly publicId: string;
  readonly name: string;
  readonly slug: string;
  readonly isSuperAdmin: boolean;
  readonly isSystem: boolean;
  readonly status: RecordStatus;
}

export interface PermissionMatrixData {
  readonly roles: readonly MatrixRoleOption[];
  readonly selected: MatrixRoleOption | null;
  readonly grantedKeys: readonly PermissionKey[];
  /** Super Admin bypasses the matrix; cells are shown granted and cannot be saved. */
  readonly readOnly: boolean;
}
