import type { RecordStatus } from "@/constants/status";

/**
 * Client-safe user projections. Internal numeric ids, password hashes and
 * lockout counters stay in the repository.
 */

export interface UserListItem {
  readonly publicId: string;
  readonly employeeCode: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string | null;
  readonly designation: string | null;
  readonly joinDate: string | null;
  readonly status: RecordStatus;
  readonly lastLoginAt: string | null;
  readonly createdAt: string;
  readonly isSuperAdmin: boolean;
  readonly role: {
    readonly publicId: string;
    readonly name: string;
    readonly slug: string;
  };
  readonly branch: {
    readonly publicId: string;
    readonly code: string;
    readonly name: string;
  };
  readonly department: {
    readonly publicId: string;
    readonly code: string;
    readonly name: string;
  } | null;
  readonly jobTitle: {
    readonly publicId: string;
    readonly code: string;
    readonly name: string;
  } | null;
}

export interface UserDetail extends UserListItem {
  readonly updatedAt: string;
  readonly mustChangePassword: boolean;
  readonly role: UserListItem["role"] & {
    readonly isSuperAdmin: boolean;
    readonly status: RecordStatus;
  };
  readonly branch: UserListItem["branch"] & {
    readonly status: RecordStatus;
  };
}

export interface UserBranchOption {
  readonly publicId: string;
  readonly code: string;
  readonly name: string;
}

export interface UserRoleOption {
  readonly publicId: string;
  readonly name: string;
  readonly slug: string;
  readonly isSuperAdmin: boolean;
}

export interface UserAssignmentOptions {
  readonly branches: readonly UserBranchOption[];
  readonly roles: readonly UserRoleOption[];
  readonly departments: readonly UserBranchOption[];
  readonly designations: readonly UserBranchOption[];
  readonly superAdminCount: number;
}

export interface UserExportResult {
  readonly csv: string;
  readonly filename: string;
  readonly rowCount: number;
  readonly truncated: boolean;
}
