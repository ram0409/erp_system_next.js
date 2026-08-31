import type { PasswordPolicyId } from "@/constants/password-policy";
import type { RecordStatus } from "@/constants/status";

/**
 * Client-safe company projection used by Company Details.
 * Internal numeric ids stay in the repository.
 */

export interface CompanyBrand {
  readonly name: string | null;
  readonly logoUrl: string | null;
}

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
  readonly logoUrl: string | null;
  readonly status: RecordStatus;
  readonly updatedAt: string;
}

/** Org-wide security policy shown on Settings → Security. */
export interface SecurityPolicy {
  readonly inactivityDeactivateAfterDays: number | null;
}

/** Chosen password policy shown on Settings → Security and used when setting a password. */
export interface PasswordPolicySettings {
  readonly policy: PasswordPolicyId;
}
