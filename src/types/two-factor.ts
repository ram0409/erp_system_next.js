export type TwoFactorMethodId = "EMAIL" | "AUTHENTICATOR";

export interface TwoFactorStatus {
  readonly emailOtpEnabled: boolean;
  readonly authenticatorEnabled: boolean;
  readonly email: string;
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
}
