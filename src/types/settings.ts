import type { RecordStatus } from "@/constants/status";

/**
 * Client-safe organisation projection used by General Settings.
 * Internal numeric ids stay in the repository.
 */

export interface OrganizationSettings {
  readonly publicId: string;
  readonly name: string;
  readonly legalName: string | null;
  readonly code: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly taxId: string | null;
  readonly addressLine: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly postalCode: string | null;
  readonly country: string | null;
  readonly status: RecordStatus;
  readonly updatedAt: string;
}
