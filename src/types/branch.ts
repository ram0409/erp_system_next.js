import type { BranchType, RecordStatus } from "@/constants/status";

/**
 * Client-safe branch projections. Internal numeric ids and organization ids
 * stay in the repository; listings and forms only ever see `publicId`.
 */

export interface BranchListItem {
  readonly publicId: string;
  readonly code: string;
  readonly name: string;
  readonly type: BranchType;
  readonly isHeadOffice: boolean;
  readonly email: string | null;
  readonly phone: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly status: RecordStatus;
  readonly createdAt: string;
  readonly userCount: number;
}

export interface BranchDetail extends BranchListItem {
  readonly addressLine1: string | null;
  readonly addressLine2: string | null;
  readonly postalCode: string | null;
  readonly country: string | null;
  readonly updatedAt: string;
}

export interface BranchExportResult {
  readonly csv: string;
  readonly filename: string;
  readonly rowCount: number;
  readonly truncated: boolean;
}
