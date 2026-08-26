import type { RecordStatus } from "@/constants/status";

export interface EntityListItem {
  readonly publicId: string;
  readonly code: string;
  readonly name: string;
  readonly legalName: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly city: string | null;
  readonly country: string | null;
  readonly status: RecordStatus;
  readonly createdAt: string;
  readonly branchCount: number;
}

export interface EntityDetail extends EntityListItem {
  readonly taxId: string | null;
  readonly addressLine: string | null;
  readonly state: string | null;
  readonly postalCode: string | null;
  readonly notes: string | null;
  readonly updatedAt: string;
}

export interface EntityOption {
  readonly publicId: string;
  readonly code: string;
  readonly name: string;
}
