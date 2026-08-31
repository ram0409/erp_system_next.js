"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ROUTES } from "@/constants/routes";
import { SUCCESS_MESSAGES } from "@/constants/messages";
import { defineAuthenticatedAction, definePublicAction } from "@/lib/action";
import { getUserAgent } from "@/lib/request";
import { clearSessionCookie, setSessionCookie } from "@/lib/session-cookie";
import {
  clearTwoFactorPendingCookie,
  setTwoFactorPendingCookie,
} from "@/lib/two-factor-pending-cookie";
import { clearWorkspaceCookie } from "@/lib/workspace-cookie";
import * as authService from "@/services/auth-service";
import { scheduleInactivitySweep } from "@/services/inactivity-service";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
} from "@/validations/auth";

/**
 * The action layer owns the session cookie; the service returns claims and stays
 * free of any request context so it remains unit-testable.
 *
 * None of these actions redirect. `redirect()` throws a control-flow exception,
 * which the action wrapper would catch and report as an error — so the client
 * navigates on a successful result instead.
 */

export const signInAction = definePublicAction({
  name: "auth.signIn",
  schema: signInSchema,
  handler: async (input, context) => {
    const result = await authService.signIn({
      email: input.email,
      password: input.password,
      ipAddress: context.ipAddress,
      userAgent: await getUserAgent(),
    });

    if (result.kind === "two_factor") {
      await setTwoFactorPendingCookie(result.challenge.challengePublicId);

      return {
        requiresTwoFactor: true,
        mustChangePassword: result.mustChangePassword,
        redirectTo: ROUTES.VERIFY_TWO_FACTOR,
      };
    }

    await setSessionCookie(result.claims);
    scheduleInactivitySweep(result.userId);

    return {
      requiresTwoFactor: false,
      mustChangePassword: result.mustChangePassword,
      redirectTo: result.mustChangePassword ? ROUTES.CHANGE_PASSWORD : ROUTES.DASHBOARD,
    };
  },
});

/** Takes no input; the default lets the client call it with no argument. */
const emptyInputSchema = z.object({}).default({});

export const signOutAction = defineAuthenticatedAction({
  name: "auth.signOut",
  schema: emptyInputSchema,
  successMessage: "Signed out.",
  handler: async (_input, actor) => {
    await authService.signOut({
      userId: actor.userId,
      email: actor.user.email,
      ipAddress: actor.ipAddress,
      userAgent: await getUserAgent(),
    });

    await clearSessionCookie();
    await clearWorkspaceCookie();
    await clearTwoFactorPendingCookie();

    return { redirectTo: ROUTES.LOGIN };
  },
});

export const changePasswordAction = defineAuthenticatedAction({
  name: "auth.changePassword",
  schema: changePasswordSchema,
  successMessage: SUCCESS_MESSAGES.PASSWORD_CHANGED,
  handler: async (input, actor) => {
    const { claims } = await authService.changePassword({
      userId: actor.userId,
      userPublicId: actor.user.publicId,
      email: actor.user.email,
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
      ipAddress: actor.ipAddress,
      userAgent: await getUserAgent(),
    });

    // The password change invalidated every cookie, including this request's, so
    // a fresh one is issued to keep the current session signed in.
    await setSessionCookie(claims);

    // The layout reads mustChangePassword to decide whether to trap navigation.
    revalidatePath("/", "layout");

    return { redirectTo: ROUTES.DASHBOARD };
  },
});

export const forgotPasswordAction = definePublicAction({
  name: "auth.forgotPassword",
  schema: forgotPasswordSchema,
  successMessage: SUCCESS_MESSAGES.PASSWORD_RESET_SENT,
  handler: async (input, context) => {
    await authService.requestPasswordReset({
      email: input.email,
      ipAddress: context.ipAddress,
      userAgent: await getUserAgent(),
    });
    return null;
  },
});

export const resetPasswordAction = definePublicAction({
  name: "auth.resetPassword",
  schema: resetPasswordSchema,
  successMessage: SUCCESS_MESSAGES.PASSWORD_RESET,
  handler: async (input, context) => {
    await authService.resetPassword({
      token: input.token,
      newPassword: input.newPassword,
      ipAddress: context.ipAddress,
      userAgent: await getUserAgent(),
    });

    await clearSessionCookie();
    await clearWorkspaceCookie();
    await clearTwoFactorPendingCookie();

    return { redirectTo: ROUTES.LOGIN };
  },
});
