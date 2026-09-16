import { z } from "zod";

export const twoFactorCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code");

export const twoFactorMethodSchema = z.enum(["EMAIL", "SMS", "AUTHENTICATOR"]);

export const verifyLoginTwoFactorSchema = z.object({
  code: twoFactorCodeSchema,
  challengePublicId: z.string().trim().min(1).max(64),
});

export type VerifyLoginTwoFactorInput = z.infer<typeof verifyLoginTwoFactorSchema>;

export const confirmEmailOtpEnrollmentSchema = z.object({
  code: twoFactorCodeSchema,
});

export const confirmSmsOtpEnrollmentSchema = z.object({
  code: twoFactorCodeSchema,
});

export const confirmAuthenticatorEnrollmentSchema = z.object({
  challengePublicId: z.string().trim().min(1).max(64),
  code: twoFactorCodeSchema,
});

export const disableTwoFactorMethodSchema = z.object({
  method: twoFactorMethodSchema,
  code: twoFactorCodeSchema,
});

export const switchLoginTwoFactorMethodSchema = z.object({
  method: twoFactorMethodSchema,
  challengePublicId: z.string().trim().min(1).max(64).optional(),
});

export const resendLoginTwoFactorSchema = z.object({
  challengePublicId: z.string().trim().min(1).max(64).optional(),
});
