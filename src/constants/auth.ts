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

export const PASSWORD_RESET_COOLDOWN_SECONDS = 60;

/** How long an emailed temporary password can be used to sign in. */
export const TEMPORARY_PASSWORD_TTL_MS = 86_400_000;

export function temporaryPasswordExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + TEMPORARY_PASSWORD_TTL_MS);
}

export function isTemporaryPasswordExpired(
  mustChangePassword: boolean,
  expiresAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!mustChangePassword || !expiresAt) {
    return false;
  }
  return now.getTime() >= expiresAt.getTime();
}
