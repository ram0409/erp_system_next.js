/** Pending sign-in step after password verification. */
export const TWO_FACTOR_PENDING_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-erp.2fa.pending" : "erp.2fa.pending";

/** How long the browser may hold an unfinished 2FA sign-in. */
export const TWO_FACTOR_PENDING_MAX_AGE_SECONDS = 600;

/** Email and SMS OTP codes expire after one minute. */
export const TWO_FACTOR_CODE_TTL_MINUTES = 1;

/** Lock a challenge after five wrong codes. */
export const TWO_FACTOR_MAX_ATTEMPTS = 5;

/** Wait until the current code expires before requesting another. */
export const TWO_FACTOR_EMAIL_RESEND_COOLDOWN_SECONDS = TWO_FACTOR_CODE_TTL_MINUTES * 60;
export const TWO_FACTOR_SMS_RESEND_COOLDOWN_SECONDS = TWO_FACTOR_CODE_TTL_MINUTES * 60;

/** UI timer color thresholds (seconds remaining). */
export const TWO_FACTOR_TIMER_GREEN_SECONDS = 45;
export const TWO_FACTOR_TIMER_ORANGE_SECONDS = 30;
export const TWO_FACTOR_TIMER_RED_SECONDS = 15;

export const TWO_FACTOR_METHOD_LABELS = {
  EMAIL: "Email OTP",
  SMS: "SMS OTP",
  AUTHENTICATOR: "Microsoft Authenticator",
} as const;
