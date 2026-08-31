import { z } from "zod";

export const twoFactorCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code");

export const verifyLoginTwoFactorSchema = z.object({
  code: twoFactorCodeSchema,
});

export type VerifyLoginTwoFactorInput = z.infer<typeof verifyLoginTwoFactorSchema>;

export const confirmEmailOtpEnrollmentSchema = z.object({
  code: twoFactorCodeSchema,
});

export const confirmAuthenticatorEnrollmentSchema = z.object({
  challengePublicId: z.string().trim().min(1).max(64),
  code: twoFactorCodeSchema,
});

export const disableTwoFactorMethodSchema = z.object({
  method: z.enum(["EMAIL", "AUTHENTICATOR"]),
  code: twoFactorCodeSchema,
});

export const switchLoginTwoFactorMethodSchema = z.object({
  method: z.enum(["EMAIL", "AUTHENTICATOR"]),
});
