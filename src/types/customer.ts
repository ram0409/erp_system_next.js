import type { RecordStatus } from "@/constants/status";

/**
 * Client-safe customer projections. Internal numeric ids stay in the repository;
 * listings and forms only ever see `publicId`.
 */

export interface CustomerBranchRef {
  readonly publicId: string;
  readonly code: string;
  readonly name: string;
}

export interface CustomerBranchOption {
  readonly publicId: string;
  readonly code: string;
  readonly name: string;
}

export interface CustomerListItem {
  readonly publicId: string;
  readonly code: string;
  readonly name: string;
  readonly contactPerson: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly branch: CustomerBranchRef;
  readonly status: RecordStatus;
  readonly createdAt: string;
}

export interface CustomerDetail extends CustomerListItem {
  readonly addressLine1: string | null;
  readonly addressLine2: string | null;
  readonly postalCode: string | null;
  readonly country: string | null;
  readonly notes: string | null;
  readonly updatedAt: string;
}

export interface CustomerExportResult {
  readonly csv: string;
  readonly filename: string;
  readonly rowCount: number;
  readonly truncated: boolean;
}
