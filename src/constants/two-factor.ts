/** Pending sign-in step after password verification. */
export const TWO_FACTOR_PENDING_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-erp.2fa.pending" : "erp.2fa.pending";

/** How long the browser may hold an unfinished 2FA sign-in. */
export const TWO_FACTOR_PENDING_MAX_AGE_SECONDS = 600;

/** Email OTP and enrolment codes expire after ten minutes. */
export const TWO_FACTOR_CODE_TTL_MINUTES = 10;

/** Lock a challenge after five wrong codes. */
export const TWO_FACTOR_MAX_ATTEMPTS = 5;

/** Minimum wait before resending an email OTP at sign-in. */
export const TWO_FACTOR_EMAIL_RESEND_COOLDOWN_SECONDS = 60;

export const TWO_FACTOR_METHOD_LABELS = {
  EMAIL: "Email OTP",
  AUTHENTICATOR: "Microsoft Authenticator",
} as const;
