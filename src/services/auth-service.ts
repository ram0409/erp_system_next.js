import "server-only";

import { env } from "@/config/env";
import { PASSWORD_RESET_COOLDOWN_SECONDS } from "@/constants/auth";
import { ERROR_MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import { AUDIT_ACTIONS, RECORD_STATUS } from "@/constants/status";
import { ForbiddenError, RateLimitError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { sendPasswordResetEmail } from "@/lib/mail";
import { hashPassword, needsRehash, verifyPassword } from "@/lib/password";
import { hashPasswordResetToken, issuePasswordResetToken } from "@/lib/password-reset-token";
import * as auditRepository from "@/repositories/audit-repository";
import * as loginAttemptRepository from "@/repositories/login-attempt-repository";
import * as passwordResetRepository from "@/repositories/password-reset-repository";
import * as userRepository from "@/repositories/user-repository";
import type { SessionClaims, SessionUser } from "@/types/session";

/**
 * Sign-in, sign-out and password change.
 *
 * The service is framework-agnostic on purpose: it returns the claims for a
 * session rather than writing a cookie, so the whole flow is unit-testable
 * without a request context. The action layer owns the cookie.
 *
 * Two rules drive the shape of everything here:
 *
 * 1. Never reveal whether an email is registered. Wrong password and unknown
 *    account produce the identical message, and an unknown account still pays
 *    the cost of an Argon2 verification so response time does not separate them.
 * 2. Only report an account problem to someone who proved they own the account.
 *    "Inactive" is disclosed after the password verifies, never before.
 */

/**
 * A real Argon2id hash of a random string, used to spend the same CPU on a
 * lookup miss as on a real verification. Without it, a missing account returns in
 * microseconds and a present one in tens of milliseconds, which enumerates users.
 */
const DECOY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$FMKSdeU9O33pbxkARWw2dA$sSr1/NXI3jMPs+eEgkvLOqi86STVcGVQ8yVpYYfMxhU";

export interface SignInRequest {
  readonly email: string;
  readonly password: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

export interface SignInResult {
  readonly claims: SessionClaims;
  readonly user: SessionUser;
  readonly mustChangePassword: boolean;
}

function invalidCredentials(): UnauthorizedError {
  return new UnauthorizedError(ERROR_MESSAGES.INVALID_CREDENTIALS);
}

export async function signIn(request: SignInRequest): Promise<SignInResult> {
  const { email, password, ipAddress, userAgent } = request;
  const lockoutWindowStart = new Date(Date.now() - env.LOGIN_LOCKOUT_MINUTES * 60_000);

  if (ipAddress) {
    const ipFailures = await loginAttemptRepository.countRecentFailures({
      ipAddress,
      since: lockoutWindowStart,
    });

    if (ipFailures >= env.LOGIN_MAX_ATTEMPTS) {
      throw new RateLimitError(
        env.LOGIN_LOCKOUT_MINUTES * 60,
        `Too many failed attempts. Try again in ${env.LOGIN_LOCKOUT_MINUTES} minute(s).`,
      );
    }
  }

  const user = await userRepository.findByEmailForAuth(email);

  if (!user) {
    await verifyPassword(DECOY_HASH, password);
    await loginAttemptRepository.record({
      emailAttempted: email,
      ipAddress,
      successful: false,
    });

    await auditRepository.record({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      actorEmail: email,
      entityType: "User",
      summary: "Sign-in attempt for an unknown email address",
      ipAddress,
      userAgent,
    });

    throw invalidCredentials();
  }

  // Checked before the password so a locked account cannot be used as an oracle
  // by continuing to guess against it.
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const retryAfterSeconds = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1_000);

    await loginAttemptRepository.record({
      emailAttempted: user.email,
      ipAddress,
      successful: false,
    });

    await auditRepository.record({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      actorUserId: user.id,
      actorEmail: user.email,
      entityType: "User",
      entityId: user.id,
      entityPublicId: user.publicId,
      summary: "Sign-in attempt on a locked account",
      ipAddress,
      userAgent,
    });

    throw new RateLimitError(
      retryAfterSeconds,
      `Too many failed attempts. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
    );
  }

  const passwordMatches = await verifyPassword(user.passwordHash, password);

  if (!passwordMatches) {
    const outcome = await userRepository.recordFailedLogin(
      user.id,
      env.LOGIN_MAX_ATTEMPTS,
      env.LOGIN_LOCKOUT_MINUTES,
    );

    await loginAttemptRepository.record({
      emailAttempted: user.email,
      ipAddress,
      successful: false,
    });

    await auditRepository.record({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      actorUserId: user.id,
      actorEmail: user.email,
      entityType: "User",
      entityId: user.id,
      entityPublicId: user.publicId,
      summary: outcome.lockedUntil ? "Incorrect password; account locked" : "Incorrect password",
      ipAddress,
      userAgent,
    });

    // Still the generic message: telling the user how many attempts remain also
    // tells an attacker, and confirms the account exists.
    throw invalidCredentials();
  }

  // Past this point the caller has proven they own the account, so a specific
  // explanation is safe to give.
  if (user.status !== RECORD_STATUS.ACTIVE) {
    throw new ForbiddenError(ERROR_MESSAGES.ACCOUNT_INACTIVE);
  }

  if (user.role.status !== RECORD_STATUS.ACTIVE) {
    throw new ForbiddenError("Your role has been deactivated. Contact your administrator.");
  }

  if (user.branch.status !== RECORD_STATUS.ACTIVE || user.branch.deletedAt !== null) {
    throw new ForbiddenError("Your branch has been deactivated. Contact your administrator.");
  }

  // The password is unchanged, so this must not bump tokenVersion and log the
  // user out of their other sessions.
  if (needsRehash(user.passwordHash)) {
    try {
      await userRepository.refreshPasswordHash(user.id, await hashPassword(password));
    } catch (error) {
      // A failed upgrade must not fail the sign-in; the old hash still verifies.
      logger.warn("Password hash upgrade failed", { userId: user.id, error });
    }
  }

  await userRepository.recordSuccessfulLogin(user.id);
  await loginAttemptRepository.record({
    emailAttempted: user.email,
    ipAddress,
    successful: true,
  });

  await auditRepository.record({
    action: AUDIT_ACTIONS.LOGIN,
    actorUserId: user.id,
    actorEmail: user.email,
    actorName: `${user.firstName} ${user.lastName}`,
    entityType: "User",
    entityId: user.id,
    entityPublicId: user.publicId,
    summary: "Signed in",
    ipAddress,
    userAgent,
  });

  return {
    claims: { userPublicId: user.publicId, tokenVersion: user.tokenVersion },
    user: {
      publicId: user.publicId,
      employeeCode: user.employeeCode,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      designation: user.designation?.name ?? null,
      avatarUrl: user.avatarPath,
      status: user.status,
      role: {
        publicId: user.role.publicId,
        slug: user.role.slug,
        name: user.role.name,
        isSuperAdmin: user.role.isSuperAdmin,
      },
      branch: {
        publicId: user.branch.publicId,
        code: user.branch.code,
        name: user.branch.name,
        entity: {
          publicId: user.branch.entity.publicId,
          code: user.branch.entity.code,
          name: user.branch.entity.name,
        },
      },
    },
    mustChangePassword: user.mustChangePassword,
  };
}

export interface SignOutRequest {
  readonly userId: number;
  readonly email: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

export async function signOut(request: SignOutRequest): Promise<void> {
  await auditRepository.record({
    action: AUDIT_ACTIONS.LOGOUT,
    actorUserId: request.userId,
    actorEmail: request.email,
    entityType: "User",
    entityId: request.userId,
    summary: "Signed out",
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
  });
}

export interface ChangePasswordRequest {
  readonly userId: number;
  readonly userPublicId: string;
  readonly email: string;
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

/**
 * Changing a password invalidates every session issued under the old one, which
 * is what makes this the remedy for a session believed to be stolen. New claims
 * are returned so the caller can re-issue a cookie and keep *this* session alive.
 */
export async function changePassword(
  request: ChangePasswordRequest,
): Promise<{ claims: SessionClaims }> {
  const stored = await userRepository.findPasswordHash(request.userId);

  if (!stored) {
    throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHENTICATED);
  }

  const currentMatches = await verifyPassword(stored.passwordHash, request.currentPassword);

  if (!currentMatches) {
    throw new UnauthorizedError("Your current password is incorrect.", {
      fieldErrors: [{ field: "currentPassword", message: "Your current password is incorrect." }],
    });
  }

  const reusedPassword = await verifyPassword(stored.passwordHash, request.newPassword);
  if (reusedPassword) {
    throw new UnauthorizedError("Choose a password you have not used before.", {
      fieldErrors: [
        { field: "newPassword", message: "Choose a password you have not used before." },
      ],
    });
  }

  await userRepository.setPassword(request.userId, await hashPassword(request.newPassword));
  await passwordResetRepository.invalidateUnusedForUser(request.userId);

  await auditRepository.record({
    action: AUDIT_ACTIONS.PASSWORD_CHANGED,
    actorUserId: request.userId,
    actorEmail: request.email,
    entityType: "User",
    entityId: request.userId,
    entityPublicId: request.userPublicId,
    summary: "Password changed",
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
  });

  return {
    claims: {
      userPublicId: request.userPublicId,
      // setPassword incremented it by exactly one.
      tokenVersion: stored.tokenVersion + 1,
    },
  };
}

export interface RequestPasswordResetInput {
  readonly email: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

/**
 * Always succeeds from the caller's point of view. Whether the email is
 * registered, inactive, or unknown, the response is identical, so this endpoint
 * cannot be used to enumerate accounts. A real mail is sent only for an active
 * user, and only if they are outside the per-account cooldown.
 */
export async function requestPasswordReset(input: RequestPasswordResetInput): Promise<void> {
  const { email, ipAddress, userAgent } = input;
  const lockoutWindowStart = new Date(Date.now() - env.LOGIN_LOCKOUT_MINUTES * 60_000);

  if (ipAddress) {
    const recent = await passwordResetRepository.countRecentByIp(ipAddress, lockoutWindowStart);
    if (recent >= env.LOGIN_MAX_ATTEMPTS) {
      throw new RateLimitError(
        env.LOGIN_LOCKOUT_MINUTES * 60,
        `Too many reset requests. Try again in ${env.LOGIN_LOCKOUT_MINUTES} minute(s).`,
      );
    }
  }

  const user = await userRepository.findByNormalizedEmail(email);

  if (!user || user.status !== RECORD_STATUS.ACTIVE) {
    await auditRepository.record({
      action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
      actorEmail: email,
      entityType: "User",
      summary: "Password reset requested for an unknown or inactive account",
      ipAddress,
      userAgent,
    });
    return;
  }

  const latest = await passwordResetRepository.findLatestCreatedAt(user.id);
  const cooldownMs = PASSWORD_RESET_COOLDOWN_SECONDS * 1_000;
  if (latest && Date.now() - latest.getTime() < cooldownMs) {
    return;
  }

  const issued = issuePasswordResetToken();
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60_000);

  await passwordResetRepository.invalidateUnusedForUser(user.id);
  await passwordResetRepository.create({
    userId: user.id,
    tokenHash: issued.tokenHash,
    expiresAt,
    requestedIp: ipAddress,
  });

  const origin = env.AUTH_URL.replace(/\/$/, "");
  const resetUrl = `${origin}${ROUTES.RESET_PASSWORD}?token=${encodeURIComponent(issued.plaintext)}`;
  await sendPasswordResetEmail({ to: user.email, resetUrl });

  await auditRepository.record({
    action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
    actorUserId: user.id,
    actorEmail: user.email,
    entityType: "User",
    entityId: user.id,
    entityPublicId: user.publicId,
    summary: "Password reset requested",
    ipAddress,
    userAgent,
  });
}

export interface ResetPasswordInput {
  readonly token: string;
  readonly newPassword: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

/**
 * Redeems a single-use token. On success every existing session is invalidated
 * (`tokenVersion` bump inside `setPassword`) and the user must sign in again —
 * auto-login after a link from email would turn a forwarded message into a session.
 */
export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const row = await passwordResetRepository.findActiveByHash(hashPasswordResetToken(input.token));

  if (!row) {
    throw new ValidationError(ERROR_MESSAGES.PASSWORD_RESET_INVALID, {
      fieldErrors: [{ field: "token", message: ERROR_MESSAGES.PASSWORD_RESET_INVALID }],
    });
  }

  const user = await userRepository.findByIdForPasswordReset(row.userId);

  if (!user || user.status !== RECORD_STATUS.ACTIVE) {
    throw new ValidationError(ERROR_MESSAGES.PASSWORD_RESET_INVALID, {
      fieldErrors: [{ field: "token", message: ERROR_MESSAGES.PASSWORD_RESET_INVALID }],
    });
  }

  const reusedPassword = await verifyPassword(user.passwordHash, input.newPassword);
  if (reusedPassword) {
    throw new ValidationError("Choose a password you have not used before.", {
      fieldErrors: [
        { field: "newPassword", message: "Choose a password you have not used before." },
      ],
    });
  }

  await userRepository.setPassword(user.id, await hashPassword(input.newPassword));
  await passwordResetRepository.markUsed(row.id);
  await passwordResetRepository.invalidateUnusedForUser(user.id);

  await auditRepository.record({
    action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
    actorUserId: user.id,
    actorEmail: user.email,
    entityType: "User",
    entityId: user.id,
    entityPublicId: user.publicId,
    summary: "Password reset completed",
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
}
