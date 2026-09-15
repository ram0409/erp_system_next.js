export type TwoFactorMethodId = "EMAIL" | "SMS" | "AUTHENTICATOR";

export interface TwoFactorStatus {
  readonly emailOtpEnabled: boolean;
  readonly smsOtpEnabled: boolean;
  readonly authenticatorEnabled: boolean;
  readonly email: string;
  readonly phone: string | null;
  readonly phoneMasked: string | null;
}

export interface AuthenticatorEnrollmentStart {
  readonly challengePublicId: string;
  readonly qrDataUrl: string;
  readonly manualSecret: string;
}

export interface LoginTwoFactorChallenge {
  readonly challengePublicId: string;
  readonly method: TwoFactorMethodId;
  readonly availableMethods: readonly TwoFactorMethodId[];
  readonly emailMasked: string;
  readonly phoneMasked: string | null;
  /** ISO timestamp when the current email/SMS code expires. */
  readonly expiresAt: string;
}
