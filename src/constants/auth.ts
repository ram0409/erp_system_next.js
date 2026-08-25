/**
 * Session cookie settings. `__Host-` locks the cookie to an exact origin and
 * requires Secure + Path=/, which blocks subdomain-injected cookies — but it
 * only works over HTTPS, so development uses the plain name.
 */
export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-erp.session" : "erp.session";

/** Where the login page sends the user after a successful sign-in. */
export const CALLBACK_URL_PARAM = "next";

/**
 * Request header carrying the current pathname, set by the proxy. Layouts are not
 * given the pathname by the App Router, and the forced-password-change guard needs
 * it to avoid redirecting the change-password page to itself.
 */
export const CURRENT_PATH_HEADER = "x-current-path";

export const PASSWORD_RULES = {
  MIN_LENGTH: 10,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SYMBOL: true,
} as const;

/**
 * Minimum gap between reset emails for one account. A new request within this
 * window reuses the already-issued link instead of sending another message.
 */
export const PASSWORD_RESET_COOLDOWN_SECONDS = 60;
