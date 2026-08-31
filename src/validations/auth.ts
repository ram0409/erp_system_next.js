import { z } from "zod";

import {
  findPasswordPolicyViolation,
  getPasswordPolicyRules,
  PASSWORD_MAX_LENGTH,
  type PasswordPolicyId,
} from "@/constants/password-policy";

/**
 * Shared by the browser form and the server action. One schema means the client
 * cannot enforce a rule the server does not, and the server never trusts that
 * the client ran it.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email address is required")
  .max(160, "Email address is too long")
  .email("Enter a valid email address")
  // Stored lowercase to match the normalized unique index.
  .transform((value) => value.toLowerCase());

/**
 * Sign-in accepts a work email or an employee code (for example
 * `systemadmin.sample`). A value that contains `@` must still be a valid email;
 * anything else is treated as a username and looked up as an employee code.
 */
export const signInIdentifierSchema = z
  .string()
  .trim()
  .min(1, "Email or username is required")
  .max(160, "Email or username is too long")
  .superRefine((value, ctx) => {
    if (value.includes("@") && !z.string().email().safeParse(value).success) {
      ctx.addIssue({ code: "custom", message: "Enter a valid email address" });
    }
  })
  .transform((value) => value.toLowerCase());

/**
 * Sign-in deliberately does *not* apply the password complexity rules. Rejecting
 * a short password at the login form tells an attacker their guess was outside
 * the policy, and it would lock out any account whose password predates a policy
 * change. Only the length ceiling is enforced, to bound hashing work.
 */
export const signInSchema = z.object({
  email: signInIdentifierSchema,
  password: z
    .string()
    .min(1, "Password is required")
    .max(PASSWORD_MAX_LENGTH, "Password is too long"),
});

export type SignInInput = z.infer<typeof signInSchema>;

/**
 * Length ceiling only. Complexity is applied in the service from the
 * organisation's chosen password policy, so a policy change does not require a
 * schema change here.
 */
export const passwordCandidateSchema = z
  .string()
  .min(1, "Password is required")
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`);

/** Client-side schema that mirrors the selected organisation policy. */
export function createPasswordSchema(policy: PasswordPolicyId) {
  const rules = getPasswordPolicyRules(policy);
  return z.string().superRefine((value, ctx) => {
    const message = findPasswordPolicyViolation(value, rules);
    if (message) {
      ctx.addIssue({ code: "custom", message });
    }
  });
}

function withPasswordConfirmation<
  T extends z.ZodType<{ newPassword: string; confirmPassword: string }>,
>(schema: T) {
  return schema.refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
}

export const changePasswordSchema = withPasswordConfirmation(
  z.object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordCandidateSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  }),
).refine((values) => values.newPassword !== values.currentPassword, {
  message: "Choose a password you have not used before",
  path: ["newPassword"],
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export function createChangePasswordSchema(policy: PasswordPolicyId) {
  return withPasswordConfirmation(
    z.object({
      currentPassword: z.string().min(1, "Enter your current password"),
      newPassword: createPasswordSchema(policy),
      confirmPassword: z.string().min(1, "Confirm your new password"),
    }),
  ).refine((values) => values.newPassword !== values.currentPassword, {
    message: "Choose a password you have not used before",
    path: ["newPassword"],
  });
}

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = withPasswordConfirmation(
  z.object({
    token: z.string().trim().min(1, "This reset link is invalid or has expired.").max(200),
    newPassword: passwordCandidateSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  }),
);

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export function createResetPasswordSchema(policy: PasswordPolicyId) {
  return withPasswordConfirmation(
    z.object({
      token: z.string().trim().min(1, "This reset link is invalid or has expired.").max(200),
      newPassword: createPasswordSchema(policy),
      confirmPassword: z.string().min(1, "Confirm your new password"),
    }),
  );
}
