import { z } from "zod";

import { PASSWORD_RULES } from "@/constants/auth";

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
    .max(PASSWORD_RULES.MAX_LENGTH, "Password is too long"),
});

export type SignInInput = z.infer<typeof signInSchema>;

/** Complexity is enforced wherever a password is *set*, not where it is checked. */
export const passwordSchema = z
  .string()
  .min(
    PASSWORD_RULES.MIN_LENGTH,
    `Password must be at least ${PASSWORD_RULES.MIN_LENGTH} characters`,
  )
  .max(PASSWORD_RULES.MAX_LENGTH, `Password must be at most ${PASSWORD_RULES.MAX_LENGTH} characters`)
  .refine(
    (value) => !PASSWORD_RULES.REQUIRE_UPPERCASE || /[A-Z]/.test(value),
    "Password must contain an uppercase letter",
  )
  .refine(
    (value) => !PASSWORD_RULES.REQUIRE_LOWERCASE || /[a-z]/.test(value),
    "Password must contain a lowercase letter",
  )
  .refine(
    (value) => !PASSWORD_RULES.REQUIRE_NUMBER || /[0-9]/.test(value),
    "Password must contain a number",
  )
  .refine(
    (value) => !PASSWORD_RULES.REQUIRE_SYMBOL || /[^A-Za-z0-9]/.test(value),
    "Password must contain a symbol",
  );

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: "Choose a password you have not used before",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1, "This reset link is invalid or has expired.").max(200),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
