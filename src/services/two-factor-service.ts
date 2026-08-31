import "server-only";

import type { TwoFactorMethod } from "@generated/prisma/enums";

import {
  TWO_FACTOR_CODE_TTL_MINUTES,
  TWO_FACTOR_EMAIL_RESEND_COOLDOWN_SECONDS,
  TWO_FACTOR_MAX_ATTEMPTS,
} from "@/constants/two-factor";
import { ERROR_MESSAGES } from "@/constants/messages";
import { AUDIT_ACTIONS } from "@/constants/status";
import { ForbiddenError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { sealField, unsealField } from "@/lib/field-encryption";
import { sendTwoFactorOtpEmail } from "@/lib/mail";
import {
  buildAuthenticatorUri,
  createAuthenticatorQrDataUrl,
  createAuthenticatorSecret,
  verifyAuthenticatorCode,
} from "@/lib/totp";
import {
  generateEmailOtpCode,
  hashEmailOtpCode,
  verifyEmailOtpCode,
} from "@/lib/two-factor-code";
import * as auditRepository from "@/repositories/audit-repository";
import * as loginAttemptRepository from "@/repositories/login-attempt-repository";
import * as twoFactorRepository from "@/repositories/two-factor-repository";
import * as userRepository from "@/repositories/user-repository";
import type { ActorContext, SessionClaims, SessionUser } from "@/types/session";
import type {
  AuthenticatorEnrollmentStart,
  LoginTwoFactorChallenge,
  TwoFactorMethodId,
  TwoFactorStatus,
} from "@/types/two-factor";

type ActiveChallenge = NonNullable<Awaited<ReturnType<typeof twoFactorRepository.findActiveByPublicId>>>;

function challengeExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + TWO_FACTOR_CODE_TTL_MINUTES * 60_000);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) {
    return email;
  }

  const visible = local.length <= 2 ? local.charAt(0) : `${local.slice(0, 2)}***`;
  return `${visible}@${domain}`;
}

function enabledMethods(settings: {
  emailOtpEnabledAt: Date | null;
  totpEnabledAt: Date | null;
}): TwoFactorMethodId[] {
  const methods: TwoFactorMethodId[] = [];
  if (settings.emailOtpEnabledAt) {
    methods.push("EMAIL");
  }
  if (settings.totpEnabledAt) {
    methods.push("AUTHENTICATOR");
  }
  return methods;
}

function defaultLoginMethod(methods: readonly TwoFactorMethodId[]): TwoFactorMethodId {
  return methods.includes("AUTHENTICATOR") ? "AUTHENTICATOR" : "EMAIL";
}

function toSessionUser(user: ActiveChallenge["user"]): SessionUser {
  return {
    publicId: user.publicId,
    employeeCode: user.employeeCode,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    avatarUrl: user.avatarPath,
    status: user.status,
    role: user.role,
    branch: user.branch,
  };
}

function sealedAuthenticatorSecret(challenge: ActiveChallenge): string | null {
  return challenge.secretEnc ?? challenge.user.totpSecretEnc;
}

export function userRequiresTwoFactor(user: {
  emailOtpEnabledAt: Date | null;
  totpEnabledAt: Date | null;
}): boolean {
  return Boolean(user.emailOtpEnabledAt || user.totpEnabledAt);
}

export async function getTwoFactorStatus(actor: ActorContext): Promise<TwoFactorStatus> {
  const settings = await twoFactorRepository.findTwoFactorSettings(actor.userId);

  if (!settings) {
    throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHENTICATED);
  }

  return {
    emailOtpEnabled: Boolean(settings.emailOtpEnabledAt),
    authenticatorEnabled: Boolean(settings.totpEnabledAt),
    email: settings.email,
  };
}

async function createEmailChallenge(input: {
  userId: number;
  email: string;
  purpose: "LOGIN" | "ENROLL" | "DISABLE";
  mailPurpose: "sign-in" | "enrolment" | "disable";
}): Promise<{ publicId: string; method: TwoFactorMethod }> {
  const code = generateEmailOtpCode();
  const sent = await sendTwoFactorOtpEmail({
    to: input.email,
    code,
    purpose: input.mailPurpose,
  });

  if (!sent) {
    throw new ValidationError("The verification email could not be sent. Try again later.");
  }

  await twoFactorRepository.invalidatePendingForUser(input.userId, input.purpose);

  return twoFactorRepository.create({
    userId: input.userId,
    purpose: input.purpose,
    method: "EMAIL",
    codeHash: hashEmailOtpCode(code),
    expiresAt: challengeExpiresAt(),
  });
}

async function assertChallengeCode(challenge: ActiveChallenge, code: string): Promise<void> {
  if (challenge.failedAttempts >= TWO_FACTOR_MAX_ATTEMPTS) {
    throw new UnauthorizedError(ERROR_MESSAGES.TWO_FACTOR_INVALID);
  }

  let valid = false;

  if (challenge.method === "EMAIL") {
    valid = challenge.codeHash ? verifyEmailOtpCode(code, challenge.codeHash) : false;
  } else {
    const sealed = sealedAuthenticatorSecret(challenge);
    valid = sealed ? verifyAuthenticatorCode(unsealField(sealed), code) : false;
  }

  if (!valid) {
    const attempts = await twoFactorRepository.incrementFailedAttempts(challenge.id);

    await auditRepository.record({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      actorUserId: challenge.userId,
      actorEmail: challenge.user.email,
      entityType: "User",
      entityId: challenge.userId,
      entityPublicId: challenge.user.publicId,
      summary:
        attempts >= TWO_FACTOR_MAX_ATTEMPTS
          ? "Two-factor verification locked after too many attempts"
          : "Incorrect two-factor code",
    });

    throw new UnauthorizedError(ERROR_MESSAGES.TWO_FACTOR_INVALID, {
      fieldErrors: [{ field: "code", message: ERROR_MESSAGES.TWO_FACTOR_INVALID }],
    });
  }
}

export async function beginLoginChallenge(input: {
  userId: number;
  email: string;
  emailOtpEnabledAt: Date | null;
  totpEnabledAt: Date | null;
}): Promise<LoginTwoFactorChallenge> {
  const availableMethods = enabledMethods(input);

  if (availableMethods.length === 0) {
    throw new ForbiddenError(ERROR_MESSAGES.TWO_FACTOR_REQUIRED);
  }

  const method = defaultLoginMethod(availableMethods);

  const challenge =
    method === "EMAIL"
      ? await createEmailChallenge({
          userId: input.userId,
          email: input.email,
          purpose: "LOGIN",
          mailPurpose: "sign-in",
        })
      : await (async () => {
          await twoFactorRepository.invalidatePendingForUser(input.userId, "LOGIN");
          return twoFactorRepository.create({
            userId: input.userId,
            purpose: "LOGIN",
            method: "AUTHENTICATOR",
            expiresAt: challengeExpiresAt(),
          });
        })();

  return {
    challengePublicId: challenge.publicId,
    method: challenge.method as TwoFactorMethodId,
    availableMethods,
    emailMasked: maskEmail(input.email),
  };
}

export async function switchLoginMethod(
  challengePublicId: string,
  method: TwoFactorMethodId,
): Promise<LoginTwoFactorChallenge> {
  const challenge = await twoFactorRepository.findActiveByPublicId(challengePublicId);

  if (!challenge || challenge.purpose !== "LOGIN") {
    throw new UnauthorizedError(ERROR_MESSAGES.TWO_FACTOR_EXPIRED);
  }

  const availableMethods = enabledMethods(challenge.user);

  if (!availableMethods.includes(method)) {
    throw new ValidationError(ERROR_MESSAGES.TWO_FACTOR_METHOD_UNAVAILABLE);
  }

  await twoFactorRepository.consume(challenge.id);

  const next =
    method === "EMAIL"
      ? await createEmailChallenge({
          userId: challenge.userId,
          email: challenge.user.email,
          purpose: "LOGIN",
          mailPurpose: "sign-in",
        })
      : await twoFactorRepository.create({
          userId: challenge.userId,
          purpose: "LOGIN",
          method: "AUTHENTICATOR",
          expiresAt: challengeExpiresAt(),
        });

  return {
    challengePublicId: next.publicId,
    method: next.method as TwoFactorMethodId,
    availableMethods,
    emailMasked: maskEmail(challenge.user.email),
  };
}

export async function resendLoginEmailCode(
  challengePublicId: string,
): Promise<LoginTwoFactorChallenge> {
  const challenge = await twoFactorRepository.findActiveByPublicId(challengePublicId);

  if (!challenge || challenge.purpose !== "LOGIN" || challenge.method !== "EMAIL") {
    throw new UnauthorizedError(ERROR_MESSAGES.TWO_FACTOR_EXPIRED);
  }

  const latest = await twoFactorRepository.findLatestLoginEmailSentAt(challenge.userId);
  if (
    latest &&
    Date.now() - latest.createdAt.getTime() < TWO_FACTOR_EMAIL_RESEND_COOLDOWN_SECONDS * 1_000
  ) {
    throw new ValidationError("Wait a minute before requesting another code.");
  }

  return switchLoginMethod(challengePublicId, "EMAIL");
}

export interface CompleteLoginResult {
  readonly claims: SessionClaims;
  readonly user: SessionUser;
  readonly userId: number;
  readonly mustChangePassword: boolean;
}

export async function completeLoginWithTwoFactor(input: {
  challengePublicId: string;
  code: string;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<CompleteLoginResult> {
  const challenge = await twoFactorRepository.findActiveByPublicId(input.challengePublicId);

  if (!challenge || challenge.purpose !== "LOGIN") {
    throw new UnauthorizedError(ERROR_MESSAGES.TWO_FACTOR_EXPIRED);
  }

  await assertChallengeCode(challenge, input.code);
  await twoFactorRepository.consume(challenge.id);

  await userRepository.recordSuccessfulLogin(challenge.userId);
  await loginAttemptRepository.record({
    emailAttempted: challenge.user.email,
    ipAddress: input.ipAddress,
    successful: true,
  });

  await auditRepository.record({
    action: AUDIT_ACTIONS.LOGIN,
    actorUserId: challenge.userId,
    actorEmail: challenge.user.email,
    actorName: `${challenge.user.firstName} ${challenge.user.lastName}`,
    entityType: "User",
    entityId: challenge.userId,
    entityPublicId: challenge.user.publicId,
    summary: "Signed in with two-factor verification",
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return {
    claims: {
      userPublicId: challenge.user.publicId,
      tokenVersion: challenge.user.tokenVersion,
    },
    user: toSessionUser(challenge.user),
    userId: challenge.userId,
    mustChangePassword: challenge.user.mustChangePassword,
  };
}

export async function getLoginChallengeSummary(
  challengePublicId: string,
): Promise<LoginTwoFactorChallenge | null> {
  const challenge = await twoFactorRepository.findActiveByPublicId(challengePublicId);

  if (!challenge || challenge.purpose !== "LOGIN") {
    return null;
  }

  return {
    challengePublicId: challenge.publicId,
    method: challenge.method as TwoFactorMethodId,
    availableMethods: enabledMethods(challenge.user),
    emailMasked: maskEmail(challenge.user.email),
  };
}

export async function requestEnableEmailOtp(actor: ActorContext): Promise<void> {
  const settings = await twoFactorRepository.findTwoFactorSettings(actor.userId);

  if (!settings) {
    throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHENTICATED);
  }

  if (settings.emailOtpEnabledAt) {
    throw new ValidationError("Email one-time passwords are already enabled.");
  }

  await createEmailChallenge({
    userId: actor.userId,
    email: settings.email,
    purpose: "ENROLL",
    mailPurpose: "enrolment",
  });
}

export async function confirmEnableEmailOtp(actor: ActorContext, code: string): Promise<void> {
  const challenge = await twoFactorRepository.findLatestActiveForUser(actor.userId, "ENROLL", "EMAIL");

  if (!challenge) {
    throw new ValidationError("Request a verification code first.");
  }

  await assertChallengeCode(challenge, code);
  await twoFactorRepository.consume(challenge.id);
  await twoFactorRepository.enableEmailOtp(actor.userId);

  await auditRepository.record({
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    actorEmail: actor.user.email,
    entityType: "User",
    entityId: actor.userId,
    entityPublicId: actor.user.publicId,
    summary: "Enabled email OTP at sign-in",
  });
}

export async function beginAuthenticatorEnrollment(
  actor: ActorContext,
): Promise<AuthenticatorEnrollmentStart> {
  const settings = await twoFactorRepository.findTwoFactorSettings(actor.userId);

  if (!settings) {
    throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHENTICATED);
  }

  if (settings.totpEnabledAt) {
    throw new ValidationError("Microsoft Authenticator is already enabled.");
  }

  const secret = createAuthenticatorSecret();
  await twoFactorRepository.invalidatePendingForUser(actor.userId, "ENROLL");

  const challenge = await twoFactorRepository.create({
    userId: actor.userId,
    purpose: "ENROLL",
    method: "AUTHENTICATOR",
    secretEnc: sealField(secret),
    expiresAt: challengeExpiresAt(),
  });

  const uri = buildAuthenticatorUri(secret, settings.email);

  return {
    challengePublicId: challenge.publicId,
    qrDataUrl: await createAuthenticatorQrDataUrl(uri),
    manualSecret: secret,
  };
}

export async function confirmAuthenticatorEnrollment(
  actor: ActorContext,
  challengePublicId: string,
  code: string,
): Promise<void> {
  const challenge = await twoFactorRepository.findActiveByPublicId(challengePublicId);

  if (
    !challenge ||
    challenge.userId !== actor.userId ||
    challenge.purpose !== "ENROLL" ||
    challenge.method !== "AUTHENTICATOR" ||
    !challenge.secretEnc
  ) {
    throw new ValidationError("Start Microsoft Authenticator setup again.");
  }

  await assertChallengeCode(challenge, code);
  await twoFactorRepository.consume(challenge.id);
  await twoFactorRepository.enableTotp(actor.userId, challenge.secretEnc);

  await auditRepository.record({
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    actorEmail: actor.user.email,
    entityType: "User",
    entityId: actor.userId,
    entityPublicId: actor.user.publicId,
    summary: "Enabled Microsoft Authenticator at sign-in",
  });
}

export async function requestDisableEmailOtp(actor: ActorContext): Promise<void> {
  const settings = await twoFactorRepository.findTwoFactorSettings(actor.userId);

  if (!settings?.emailOtpEnabledAt) {
    throw new ValidationError("Email one-time passwords are not enabled.");
  }

  await createEmailChallenge({
    userId: actor.userId,
    email: settings.email,
    purpose: "DISABLE",
    mailPurpose: "disable",
  });
}

export async function disableEmailOtp(actor: ActorContext, code: string): Promise<void> {
  const settings = await twoFactorRepository.findTwoFactorSettings(actor.userId);

  if (!settings?.emailOtpEnabledAt) {
    throw new ValidationError("Email one-time passwords are not enabled.");
  }

  let verified = false;

  if (settings.totpEnabledAt && settings.totpSecretEnc) {
    verified = verifyAuthenticatorCode(unsealField(settings.totpSecretEnc), code);
  }

  if (!verified) {
    const challenge = await twoFactorRepository.findLatestActiveForUser(
      actor.userId,
      "DISABLE",
      "EMAIL",
    );

    if (!challenge) {
      if (settings.totpEnabledAt) {
        throw new UnauthorizedError(ERROR_MESSAGES.TWO_FACTOR_INVALID, {
          fieldErrors: [{ field: "code", message: ERROR_MESSAGES.TWO_FACTOR_INVALID }],
        });
      }

      throw new ValidationError("Request a verification code first.");
    }

    await assertChallengeCode(challenge, code);
    await twoFactorRepository.consume(challenge.id);
    verified = true;
  }

  if (!verified) {
    throw new UnauthorizedError(ERROR_MESSAGES.TWO_FACTOR_INVALID, {
      fieldErrors: [{ field: "code", message: ERROR_MESSAGES.TWO_FACTOR_INVALID }],
    });
  }

  await twoFactorRepository.disableEmailOtp(actor.userId);

  await auditRepository.record({
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    actorEmail: actor.user.email,
    entityType: "User",
    entityId: actor.userId,
    entityPublicId: actor.user.publicId,
    summary: "Disabled email OTP at sign-in",
  });
}

export async function disableAuthenticator(actor: ActorContext, code: string): Promise<void> {
  const settings = await twoFactorRepository.findTwoFactorSettings(actor.userId);

  if (!settings?.totpEnabledAt || !settings.totpSecretEnc) {
    throw new ValidationError("Microsoft Authenticator is not enabled.");
  }

  let verified = verifyAuthenticatorCode(unsealField(settings.totpSecretEnc), code);

  if (!verified && settings.emailOtpEnabledAt) {
    verified = await tryEmailDisableCode(actor.userId, code);
  }

  if (!verified) {
    throw new UnauthorizedError(ERROR_MESSAGES.TWO_FACTOR_INVALID, {
      fieldErrors: [{ field: "code", message: ERROR_MESSAGES.TWO_FACTOR_INVALID }],
    });
  }

  await twoFactorRepository.disableTotp(actor.userId);

  await auditRepository.record({
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    actorEmail: actor.user.email,
    entityType: "User",
    entityId: actor.userId,
    entityPublicId: actor.user.publicId,
    summary: "Disabled Microsoft Authenticator at sign-in",
  });
}

async function tryEmailDisableCode(userId: number, code: string): Promise<boolean> {
  const challenge = await twoFactorRepository.findLatestActiveForUser(userId, "DISABLE", "EMAIL");
  if (!challenge?.codeHash) {
    return false;
  }

  if (!verifyEmailOtpCode(code, challenge.codeHash)) {
    return false;
  }

  await twoFactorRepository.consume(challenge.id);
  return true;
}

export async function requestDisableAuthenticator(actor: ActorContext): Promise<void> {
  const settings = await twoFactorRepository.findTwoFactorSettings(actor.userId);

  if (!settings?.totpEnabledAt) {
    throw new ValidationError("Microsoft Authenticator is not enabled.");
  }

  if (settings.emailOtpEnabledAt) {
    await createEmailChallenge({
      userId: actor.userId,
      email: settings.email,
      purpose: "DISABLE",
      mailPurpose: "disable",
    });
  }
}
