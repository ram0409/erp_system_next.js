import "server-only";

import type { TwoFactorMethod } from "@generated/prisma/enums";

import {
  TWO_FACTOR_CODE_TTL_MINUTES,
  TWO_FACTOR_MAX_ATTEMPTS,
  TWO_FACTOR_PENDING_MAX_AGE_SECONDS,
} from "@/constants/two-factor";
import { ERROR_MESSAGES } from "@/constants/messages";
import { AUDIT_ACTIONS, RECORD_STATUS } from "@/constants/status";
import { ForbiddenError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { sealField, unsealField } from "@/lib/field-encryption";
import { sendTwoFactorOtpEmail } from "@/lib/mail";
import { maskPhone, sendTwoFactorOtpSms, toE164Phone } from "@/lib/sms";
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

function authenticatorChallengeExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + TWO_FACTOR_PENDING_MAX_AGE_SECONDS * 1_000);
}

function isWithinLoginPendingWindow(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() < TWO_FACTOR_PENDING_MAX_AGE_SECONDS * 1_000;
}

async function requireLoginChallenge(challengePublicId: string): Promise<ActiveChallenge> {
  const challenge = await twoFactorRepository.findLoginByPublicId(challengePublicId);

  if (!challenge || !isWithinLoginPendingWindow(challenge.createdAt)) {
    throw new UnauthorizedError(ERROR_MESSAGES.TWO_FACTOR_EXPIRED);
  }

  return challenge;
}

/**
 * Prefer the challenge the UI is showing (matches the OTP the user received).
 * Fall back to the pending cookie when the client id is already consumed/stale.
 * Cookie and client ids must belong to the same user when both resolve.
 */
async function resolveVerifyChallenge(
  clientChallengePublicId: string,
  cookieChallengePublicId: string,
): Promise<ActiveChallenge> {
  const cookieMeta = await twoFactorRepository.findLoginChallengeByPublicId(
    cookieChallengePublicId,
  );

  if (!cookieMeta) {
    throw new UnauthorizedError(ERROR_MESSAGES.TWO_FACTOR_EXPIRED);
  }

  const preferred = await twoFactorRepository.findLoginByPublicId(clientChallengePublicId);
  if (
    preferred &&
    preferred.userId === cookieMeta.userId &&
    isWithinLoginPendingWindow(preferred.createdAt)
  ) {
    return preferred;
  }

  if (!isWithinLoginPendingWindow(cookieMeta.createdAt)) {
    throw new UnauthorizedError(ERROR_MESSAGES.TWO_FACTOR_EXPIRED);
  }

  if (cookieChallengePublicId !== clientChallengePublicId) {
    const fromCookie = await twoFactorRepository.findLoginByPublicId(cookieChallengePublicId);
    if (fromCookie && isWithinLoginPendingWindow(fromCookie.createdAt)) {
      return fromCookie;
    }
  }

  throw new UnauthorizedError(ERROR_MESSAGES.TWO_FACTOR_EXPIRED);
}

/** Returns the client challenge public id when it is active and owned by the cookie's user. */
export async function resolveLoginChallengePublicId(
  clientChallengePublicId: string,
  cookieChallengePublicId: string,
): Promise<string | null> {
  const cookieMeta = await twoFactorRepository.findLoginChallengeByPublicId(
    cookieChallengePublicId,
  );

  if (!cookieMeta) {
    return null;
  }

  const preferred = await twoFactorRepository.findLoginByPublicId(clientChallengePublicId);
  if (
    preferred &&
    preferred.userId === cookieMeta.userId &&
    isWithinLoginPendingWindow(preferred.createdAt)
  ) {
    return preferred.publicId;
  }

  return null;
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
  smsOtpEnabledAt: Date | null;
  totpEnabledAt: Date | null;
}): TwoFactorMethodId[] {
  const methods: TwoFactorMethodId[] = [];
  if (settings.emailOtpEnabledAt) {
    methods.push("EMAIL");
  }
  if (settings.smsOtpEnabledAt) {
    methods.push("SMS");
  }
  if (settings.totpEnabledAt) {
    methods.push("AUTHENTICATOR");
  }
  return methods;
}

function defaultLoginMethod(methods: readonly TwoFactorMethodId[]): TwoFactorMethodId {
  if (methods.includes("AUTHENTICATOR")) {
    return "AUTHENTICATOR";
  }
  if (methods.includes("SMS")) {
    return "SMS";
  }
  return "EMAIL";
}

function requireUserPhone(phone: string | null | undefined): string {
  const value = phone?.trim() ?? "";
  if (!value || !toE164Phone(value)) {
    throw new ValidationError(
      "Add a valid phone number on your profile before enabling SMS one-time passwords.",
    );
  }
  return value;
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
  smsOtpEnabledAt: Date | null;
  totpEnabledAt: Date | null;
}): boolean {
  return Boolean(user.emailOtpEnabledAt || user.smsOtpEnabledAt || user.totpEnabledAt);
}

export async function getTwoFactorStatus(actor: ActorContext): Promise<TwoFactorStatus> {
  const settings = await twoFactorRepository.findTwoFactorSettings(actor.userId);

  if (!settings) {
    throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHENTICATED);
  }

  return {
    emailOtpEnabled: Boolean(settings.emailOtpEnabledAt),
    smsOtpEnabled: Boolean(settings.smsOtpEnabledAt),
    authenticatorEnabled: Boolean(settings.totpEnabledAt),
    email: settings.email,
    phone: settings.phone,
    phoneMasked: settings.phone ? maskPhone(settings.phone) : null,
  };
}

async function createEmailChallenge(input: {
  userId: number;
  email: string;
  purpose: "LOGIN" | "ENROLL" | "DISABLE";
  mailPurpose: "sign-in" | "enrolment" | "disable";
}): Promise<{ publicId: string; method: TwoFactorMethod; expiresAt: Date }> {
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

async function createSmsChallenge(input: {
  userId: number;
  phone: string;
  purpose: "LOGIN" | "ENROLL" | "DISABLE";
  smsPurpose: "sign-in" | "enrolment" | "disable";
}): Promise<{ publicId: string; method: TwoFactorMethod; expiresAt: Date }> {
  const phone = requireUserPhone(input.phone);
  const code = generateEmailOtpCode();
  const sent = await sendTwoFactorOtpSms({
    to: phone,
    code,
    purpose: input.smsPurpose,
  });

  if (!sent) {
    throw new ValidationError("The verification SMS could not be sent. Try again later.");
  }

  await twoFactorRepository.invalidatePendingForUser(input.userId, input.purpose);

  return twoFactorRepository.create({
    userId: input.userId,
    purpose: input.purpose,
    method: "SMS",
    codeHash: hashEmailOtpCode(code),
    expiresAt: challengeExpiresAt(),
  });
}

async function assertChallengeCode(challenge: ActiveChallenge, code: string): Promise<void> {
  if (challenge.failedAttempts >= TWO_FACTOR_MAX_ATTEMPTS) {
    throw new UnauthorizedError(ERROR_MESSAGES.TWO_FACTOR_INVALID);
  }

  let valid = false;

  if (challenge.method === "EMAIL" || challenge.method === "SMS") {
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

function toLoginChallengeSummary(input: {
  challengePublicId: string;
  method: TwoFactorMethodId;
  availableMethods: readonly TwoFactorMethodId[];
  email: string;
  phone: string | null;
  expiresAt: Date;
}): LoginTwoFactorChallenge {
  return {
    challengePublicId: input.challengePublicId,
    method: input.method,
    availableMethods: input.availableMethods,
    emailMasked: maskEmail(input.email),
    phoneMasked: input.phone ? maskPhone(input.phone) : null,
    expiresAt: input.expiresAt.toISOString(),
  };
}

export async function beginLoginChallenge(input: {
  userId: number;
  email: string;
  phone: string | null;
  emailOtpEnabledAt: Date | null;
  smsOtpEnabledAt: Date | null;
  totpEnabledAt: Date | null;
}): Promise<LoginTwoFactorChallenge> {
  const availableMethods = enabledMethods(input);

  if (availableMethods.length === 0) {
    throw new ForbiddenError(ERROR_MESSAGES.TWO_FACTOR_REQUIRED);
  }

  const method = defaultLoginMethod(availableMethods);

  let challenge: { publicId: string; method: TwoFactorMethod; expiresAt: Date };

  if (method === "EMAIL") {
    challenge = await createEmailChallenge({
      userId: input.userId,
      email: input.email,
      purpose: "LOGIN",
      mailPurpose: "sign-in",
    });
  } else if (method === "SMS") {
    challenge = await createSmsChallenge({
      userId: input.userId,
      phone: input.phone ?? "",
      purpose: "LOGIN",
      smsPurpose: "sign-in",
    });
  } else {
    await twoFactorRepository.invalidatePendingForUser(input.userId, "LOGIN");
    challenge = await twoFactorRepository.create({
      userId: input.userId,
      purpose: "LOGIN",
      method: "AUTHENTICATOR",
      expiresAt: authenticatorChallengeExpiresAt(),
    });
  }

  return toLoginChallengeSummary({
    challengePublicId: challenge.publicId,
    method: challenge.method as TwoFactorMethodId,
    availableMethods,
    email: input.email,
    phone: input.phone,
    expiresAt: challenge.expiresAt,
  });
}

export async function switchLoginMethod(
  challengePublicId: string,
  method: TwoFactorMethodId,
): Promise<LoginTwoFactorChallenge> {
  const challenge = await requireLoginChallenge(challengePublicId);

  const availableMethods = enabledMethods(challenge.user);

  if (!availableMethods.includes(method)) {
    throw new ValidationError(ERROR_MESSAGES.TWO_FACTOR_METHOD_UNAVAILABLE);
  }

  // Send/create first. createEmail/SmsChallenge invalidates pending only after a
  // successful send, so a failed SMS/email never forces the user back to login.
  let next: { publicId: string; method: TwoFactorMethod; expiresAt: Date };

  if (method === "EMAIL") {
    next = await createEmailChallenge({
      userId: challenge.userId,
      email: challenge.user.email,
      purpose: "LOGIN",
      mailPurpose: "sign-in",
    });
  } else if (method === "SMS") {
    next = await createSmsChallenge({
      userId: challenge.userId,
      phone: challenge.user.phone ?? "",
      purpose: "LOGIN",
      smsPurpose: "sign-in",
    });
  } else {
    await twoFactorRepository.invalidatePendingForUser(challenge.userId, "LOGIN");
    next = await twoFactorRepository.create({
      userId: challenge.userId,
      purpose: "LOGIN",
      method: "AUTHENTICATOR",
      expiresAt: authenticatorChallengeExpiresAt(),
    });
  }

  return toLoginChallengeSummary({
    challengePublicId: next.publicId,
    method: next.method as TwoFactorMethodId,
    availableMethods,
    email: challenge.user.email,
    phone: challenge.user.phone,
    expiresAt: next.expiresAt,
  });
}

export async function resendLoginEmailCode(
  challengePublicId: string,
): Promise<LoginTwoFactorChallenge> {
  const challenge = await requireLoginChallenge(challengePublicId);

  if (challenge.method !== "EMAIL") {
    throw new ValidationError("Switch to email verification before requesting another email code.");
  }

  if (challenge.expiresAt.getTime() > Date.now()) {
    throw new ValidationError("Wait for the current code to expire before requesting another.");
  }

  return switchLoginMethod(challengePublicId, "EMAIL");
}

export async function resendLoginSmsCode(
  challengePublicId: string,
): Promise<LoginTwoFactorChallenge> {
  const challenge = await requireLoginChallenge(challengePublicId);

  if (challenge.method !== "SMS") {
    throw new ValidationError("Switch to SMS verification before requesting another SMS code.");
  }

  if (challenge.expiresAt.getTime() > Date.now()) {
    throw new ValidationError("Wait for the current code to expire before requesting another.");
  }

  return switchLoginMethod(challengePublicId, "SMS");
}

export interface CompleteLoginResult {
  readonly claims: SessionClaims;
  readonly user: SessionUser;
  readonly userId: number;
  readonly mustChangePassword: boolean;
}

function assertAccountMayCompleteSignIn(user: ActiveChallenge["user"]): void {
  if (user.status !== RECORD_STATUS.ACTIVE) {
    throw new ForbiddenError(ERROR_MESSAGES.ACCOUNT_INACTIVE);
  }

  if (user.role.status !== RECORD_STATUS.ACTIVE) {
    throw new ForbiddenError("Your role has been deactivated. Contact your administrator.");
  }

  if (user.branch.status !== RECORD_STATUS.ACTIVE || user.branch.deletedAt !== null) {
    throw new ForbiddenError("Your branch has been deactivated. Contact your administrator.");
  }
}

export async function completeLoginWithTwoFactor(input: {
  challengePublicId: string;
  cookieChallengePublicId: string;
  code: string;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<CompleteLoginResult> {
  const challenge = await resolveVerifyChallenge(
    input.challengePublicId,
    input.cookieChallengePublicId,
  );

  if (
    (challenge.method === "EMAIL" || challenge.method === "SMS") &&
    challenge.expiresAt.getTime() <= Date.now()
  ) {
    throw new ValidationError(ERROR_MESSAGES.TWO_FACTOR_CODE_EXPIRED);
  }

  if (challenge.expiresAt.getTime() <= Date.now()) {
    throw new UnauthorizedError(ERROR_MESSAGES.TWO_FACTOR_EXPIRED);
  }

  await assertChallengeCode(challenge, input.code);

  try {
    assertAccountMayCompleteSignIn(challenge.user);
  } catch (error) {
    await twoFactorRepository.consume(challenge.id);
    await loginAttemptRepository.record({
      emailAttempted: challenge.user.email,
      ipAddress: input.ipAddress,
      successful: false,
    });
    await auditRepository.record({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      actorUserId: challenge.userId,
      actorEmail: challenge.user.email,
      entityType: "User",
      entityId: challenge.userId,
      entityPublicId: challenge.user.publicId,
      summary: "Two-factor verified but account is inactive or deactivated",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
    throw error;
  }

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
  const challenge = await twoFactorRepository.findLoginByPublicId(challengePublicId);

  if (!challenge || !isWithinLoginPendingWindow(challenge.createdAt)) {
    return null;
  }

  try {
    assertAccountMayCompleteSignIn(challenge.user);
  } catch {
    await twoFactorRepository.consume(challenge.id);
    return null;
  }

  return toLoginChallengeSummary({
    challengePublicId: challenge.publicId,
    method: challenge.method as TwoFactorMethodId,
    availableMethods: enabledMethods(challenge.user),
    email: challenge.user.email,
    phone: challenge.user.phone,
    expiresAt: challenge.expiresAt,
  });
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

export async function requestEnableSmsOtp(actor: ActorContext): Promise<void> {
  const settings = await twoFactorRepository.findTwoFactorSettings(actor.userId);

  if (!settings) {
    throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHENTICATED);
  }

  if (settings.smsOtpEnabledAt) {
    throw new ValidationError("SMS one-time passwords are already enabled.");
  }

  await createSmsChallenge({
    userId: actor.userId,
    phone: settings.phone ?? "",
    purpose: "ENROLL",
    smsPurpose: "enrolment",
  });
}

export async function confirmEnableSmsOtp(actor: ActorContext, code: string): Promise<void> {
  const challenge = await twoFactorRepository.findLatestActiveForUser(actor.userId, "ENROLL", "SMS");

  if (!challenge) {
    throw new ValidationError("Request a verification code first.");
  }

  await assertChallengeCode(challenge, code);
  await twoFactorRepository.consume(challenge.id);
  await twoFactorRepository.enableSmsOtp(actor.userId);

  await auditRepository.record({
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    actorEmail: actor.user.email,
    entityType: "User",
    entityId: actor.userId,
    entityPublicId: actor.user.publicId,
    summary: "Enabled SMS OTP at sign-in",
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

  const verified = await verifyDisableCode(actor.userId, code, settings, "EMAIL");

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

export async function requestDisableSmsOtp(actor: ActorContext): Promise<void> {
  const settings = await twoFactorRepository.findTwoFactorSettings(actor.userId);

  if (!settings?.smsOtpEnabledAt) {
    throw new ValidationError("SMS one-time passwords are not enabled.");
  }

  await createSmsChallenge({
    userId: actor.userId,
    phone: settings.phone ?? "",
    purpose: "DISABLE",
    smsPurpose: "disable",
  });
}

export async function disableSmsOtp(actor: ActorContext, code: string): Promise<void> {
  const settings = await twoFactorRepository.findTwoFactorSettings(actor.userId);

  if (!settings?.smsOtpEnabledAt) {
    throw new ValidationError("SMS one-time passwords are not enabled.");
  }

  const verified = await verifyDisableCode(actor.userId, code, settings, "SMS");

  if (!verified) {
    throw new UnauthorizedError(ERROR_MESSAGES.TWO_FACTOR_INVALID, {
      fieldErrors: [{ field: "code", message: ERROR_MESSAGES.TWO_FACTOR_INVALID }],
    });
  }

  await twoFactorRepository.disableSmsOtp(actor.userId);

  await auditRepository.record({
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    actorEmail: actor.user.email,
    entityType: "User",
    entityId: actor.userId,
    entityPublicId: actor.user.publicId,
    summary: "Disabled SMS OTP at sign-in",
  });
}

export async function disableAuthenticator(actor: ActorContext, code: string): Promise<void> {
  const settings = await twoFactorRepository.findTwoFactorSettings(actor.userId);

  if (!settings?.totpEnabledAt || !settings.totpSecretEnc) {
    throw new ValidationError("Microsoft Authenticator is not enabled.");
  }

  const verified = await verifyDisableCode(actor.userId, code, settings, "AUTHENTICATOR");

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

type DisableSettings = {
  emailOtpEnabledAt: Date | null;
  smsOtpEnabledAt: Date | null;
  totpEnabledAt: Date | null;
  totpSecretEnc: string | null;
  phone: string | null;
  email: string;
};

async function verifyDisableCode(
  userId: number,
  code: string,
  settings: DisableSettings,
  target: TwoFactorMethodId,
): Promise<boolean> {
  if (settings.totpEnabledAt && settings.totpSecretEnc) {
    if (verifyAuthenticatorCode(unsealField(settings.totpSecretEnc), code)) {
      return true;
    }
  }

  const emailChallenge = await twoFactorRepository.findLatestActiveForUser(
    userId,
    "DISABLE",
    "EMAIL",
  );
  if (emailChallenge?.codeHash && verifyEmailOtpCode(code, emailChallenge.codeHash)) {
    await twoFactorRepository.consume(emailChallenge.id);
    return true;
  }

  const smsChallenge = await twoFactorRepository.findLatestActiveForUser(userId, "DISABLE", "SMS");
  if (smsChallenge?.codeHash && verifyEmailOtpCode(code, smsChallenge.codeHash)) {
    await twoFactorRepository.consume(smsChallenge.id);
    return true;
  }

  if (target === "EMAIL" && !settings.totpEnabledAt && !settings.smsOtpEnabledAt) {
    return false;
  }

  if (target === "SMS" && !settings.totpEnabledAt && !settings.emailOtpEnabledAt) {
    return false;
  }

  return false;
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
    return;
  }

  if (settings.smsOtpEnabledAt) {
    await createSmsChallenge({
      userId: actor.userId,
      phone: settings.phone ?? "",
      purpose: "DISABLE",
      smsPurpose: "disable",
    });
  }
}
