"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/constants/routes";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/constants/messages";
import { defineAuthenticatedAction, definePublicAction } from "@/lib/action";
import { UnauthorizedError } from "@/lib/errors";
import { getUserAgent } from "@/lib/request";
import {
  clearTwoFactorPendingCookie,
  readTwoFactorPendingCookie,
  setTwoFactorPendingCookie,
} from "@/lib/two-factor-pending-cookie";
import { setSessionCookie } from "@/lib/session-cookie";
import { scheduleInactivitySweep } from "@/services/inactivity-service";
import * as twoFactorService from "@/services/two-factor-service";
import {
  confirmAuthenticatorEnrollmentSchema,
  confirmEmailOtpEnrollmentSchema,
  confirmSmsOtpEnrollmentSchema,
  disableTwoFactorMethodSchema,
  resendLoginTwoFactorSchema,
  switchLoginTwoFactorMethodSchema,
  verifyLoginTwoFactorSchema,
} from "@/validations/two-factor";
import { z } from "zod";

const emptyInputSchema = z.object({}).default({});

async function resolvePendingChallengePublicId(
  clientChallengePublicId: string | undefined,
): Promise<string> {
  const cookieChallengePublicId = await readTwoFactorPendingCookie();

  if (!cookieChallengePublicId) {
    throw new UnauthorizedError(ERROR_MESSAGES.TWO_FACTOR_EXPIRED);
  }

  if (!clientChallengePublicId || clientChallengePublicId === cookieChallengePublicId) {
    return cookieChallengePublicId;
  }

  const synced = await twoFactorService.resolveLoginChallengePublicId(
    clientChallengePublicId,
    cookieChallengePublicId,
  );

  if (synced) {
    await setTwoFactorPendingCookie(synced);
    return synced;
  }

  return cookieChallengePublicId;
}

/** Clears pending 2FA without a GET that Next can prefetch. */
export const cancelLoginTwoFactorAction = definePublicAction({
  name: "twoFactor.cancelLogin",
  schema: emptyInputSchema,
  handler: async () => {
    await clearTwoFactorPendingCookie();
    return { redirectTo: ROUTES.LOGIN };
  },
});

export const verifyLoginTwoFactorAction = definePublicAction({
  name: "twoFactor.verifyLogin",
  schema: verifyLoginTwoFactorSchema,
  successMessage: SUCCESS_MESSAGES.TWO_FACTOR_VERIFIED,
  handler: async (input, context) => {
    const cookieChallengePublicId = await readTwoFactorPendingCookie();

    if (!cookieChallengePublicId) {
      throw new UnauthorizedError(ERROR_MESSAGES.TWO_FACTOR_EXPIRED);
    }

    const result = await twoFactorService.completeLoginWithTwoFactor({
      challengePublicId: input.challengePublicId,
      cookieChallengePublicId,
      code: input.code,
      ipAddress: context.ipAddress,
      userAgent: await getUserAgent(),
    });

    await clearTwoFactorPendingCookie();
    await setSessionCookie(result.claims);
    scheduleInactivitySweep(result.userId);

    return {
      redirectTo: result.mustChangePassword ? ROUTES.CHANGE_PASSWORD : ROUTES.DASHBOARD,
    };
  },
});

export const switchLoginTwoFactorMethodAction = definePublicAction({
  name: "twoFactor.switchLoginMethod",
  schema: switchLoginTwoFactorMethodSchema,
  handler: async (input) => {
    const challengePublicId = await resolvePendingChallengePublicId(input.challengePublicId);
    const challenge = await twoFactorService.switchLoginMethod(challengePublicId, input.method);
    await setTwoFactorPendingCookie(challenge.challengePublicId);

    return challenge;
  },
});

export const resendLoginTwoFactorEmailAction = definePublicAction({
  name: "twoFactor.resendLoginEmail",
  schema: resendLoginTwoFactorSchema,
  successMessage: SUCCESS_MESSAGES.TWO_FACTOR_CODE_SENT,
  handler: async (input) => {
    const challengePublicId = await resolvePendingChallengePublicId(input.challengePublicId);
    const challenge = await twoFactorService.resendLoginEmailCode(challengePublicId);
    await setTwoFactorPendingCookie(challenge.challengePublicId);

    return challenge;
  },
});

export const resendLoginTwoFactorSmsAction = definePublicAction({
  name: "twoFactor.resendLoginSms",
  schema: resendLoginTwoFactorSchema,
  successMessage: SUCCESS_MESSAGES.TWO_FACTOR_CODE_SENT,
  handler: async (input) => {
    const challengePublicId = await resolvePendingChallengePublicId(input.challengePublicId);
    const challenge = await twoFactorService.resendLoginSmsCode(challengePublicId);
    await setTwoFactorPendingCookie(challenge.challengePublicId);

    return challenge;
  },
});

export const getTwoFactorStatusAction = defineAuthenticatedAction({
  name: "twoFactor.status",
  schema: emptyInputSchema,
  handler: async (_input, actor) => twoFactorService.getTwoFactorStatus(actor),
});

export const requestEnableEmailOtpAction = defineAuthenticatedAction({
  name: "twoFactor.requestEnableEmail",
  schema: emptyInputSchema,
  successMessage: SUCCESS_MESSAGES.TWO_FACTOR_CODE_SENT,
  handler: async (_input, actor) => {
    await twoFactorService.requestEnableEmailOtp(actor);
    return null;
  },
});

export const confirmEnableEmailOtpAction = defineAuthenticatedAction({
  name: "twoFactor.confirmEnableEmail",
  schema: confirmEmailOtpEnrollmentSchema,
  successMessage: SUCCESS_MESSAGES.TWO_FACTOR_EMAIL_ENABLED,
  handler: async (input, actor) => {
    await twoFactorService.confirmEnableEmailOtp(actor, input.code);
    revalidatePath(ROUTES.SETTINGS_SECURITY);
    return null;
  },
});

export const requestEnableSmsOtpAction = defineAuthenticatedAction({
  name: "twoFactor.requestEnableSms",
  schema: emptyInputSchema,
  successMessage: SUCCESS_MESSAGES.TWO_FACTOR_CODE_SENT,
  handler: async (_input, actor) => {
    await twoFactorService.requestEnableSmsOtp(actor);
    return null;
  },
});

export const confirmEnableSmsOtpAction = defineAuthenticatedAction({
  name: "twoFactor.confirmEnableSms",
  schema: confirmSmsOtpEnrollmentSchema,
  successMessage: SUCCESS_MESSAGES.TWO_FACTOR_SMS_ENABLED,
  handler: async (input, actor) => {
    await twoFactorService.confirmEnableSmsOtp(actor, input.code);
    revalidatePath(ROUTES.SETTINGS_SECURITY);
    return null;
  },
});

export const beginAuthenticatorEnrollmentAction = defineAuthenticatedAction({
  name: "twoFactor.beginAuthenticator",
  schema: emptyInputSchema,
  handler: async (_input, actor) => twoFactorService.beginAuthenticatorEnrollment(actor),
});

export const confirmAuthenticatorEnrollmentAction = defineAuthenticatedAction({
  name: "twoFactor.confirmAuthenticator",
  schema: confirmAuthenticatorEnrollmentSchema,
  successMessage: SUCCESS_MESSAGES.TWO_FACTOR_AUTHENTICATOR_ENABLED,
  handler: async (input, actor) => {
    await twoFactorService.confirmAuthenticatorEnrollment(
      actor,
      input.challengePublicId,
      input.code,
    );
    revalidatePath(ROUTES.SETTINGS_SECURITY);
    return null;
  },
});

export const requestDisableEmailOtpAction = defineAuthenticatedAction({
  name: "twoFactor.requestDisableEmail",
  schema: emptyInputSchema,
  successMessage: SUCCESS_MESSAGES.TWO_FACTOR_CODE_SENT,
  handler: async (_input, actor) => {
    await twoFactorService.requestDisableEmailOtp(actor);
    return null;
  },
});

export const disableEmailOtpAction = defineAuthenticatedAction({
  name: "twoFactor.disableEmail",
  schema: disableTwoFactorMethodSchema.refine((values) => values.method === "EMAIL", {
    message: "Invalid method",
    path: ["method"],
  }),
  successMessage: SUCCESS_MESSAGES.TWO_FACTOR_EMAIL_DISABLED,
  handler: async (input, actor) => {
    await twoFactorService.disableEmailOtp(actor, input.code);
    revalidatePath(ROUTES.SETTINGS_SECURITY);
    return null;
  },
});

export const requestDisableSmsOtpAction = defineAuthenticatedAction({
  name: "twoFactor.requestDisableSms",
  schema: emptyInputSchema,
  successMessage: SUCCESS_MESSAGES.TWO_FACTOR_CODE_SENT,
  handler: async (_input, actor) => {
    await twoFactorService.requestDisableSmsOtp(actor);
    return null;
  },
});

export const disableSmsOtpAction = defineAuthenticatedAction({
  name: "twoFactor.disableSms",
  schema: disableTwoFactorMethodSchema.refine((values) => values.method === "SMS", {
    message: "Invalid method",
    path: ["method"],
  }),
  successMessage: SUCCESS_MESSAGES.TWO_FACTOR_SMS_DISABLED,
  handler: async (input, actor) => {
    await twoFactorService.disableSmsOtp(actor, input.code);
    revalidatePath(ROUTES.SETTINGS_SECURITY);
    return null;
  },
});

export const requestDisableAuthenticatorAction = defineAuthenticatedAction({
  name: "twoFactor.requestDisableAuthenticator",
  schema: emptyInputSchema,
  successMessage: SUCCESS_MESSAGES.TWO_FACTOR_CODE_SENT,
  handler: async (_input, actor) => {
    await twoFactorService.requestDisableAuthenticator(actor);
    return null;
  },
});

export const disableAuthenticatorAction = defineAuthenticatedAction({
  name: "twoFactor.disableAuthenticator",
  schema: disableTwoFactorMethodSchema.refine((values) => values.method === "AUTHENTICATOR", {
    message: "Invalid method",
    path: ["method"],
  }),
  successMessage: SUCCESS_MESSAGES.TWO_FACTOR_AUTHENTICATOR_DISABLED,
  handler: async (input, actor) => {
    await twoFactorService.disableAuthenticator(actor, input.code);
    revalidatePath(ROUTES.SETTINGS_SECURITY);
    return null;
  },
});
