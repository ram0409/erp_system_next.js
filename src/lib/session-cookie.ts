import "server-only";

import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/constants/auth";
import { env, isProduction } from "@/config/env";
import { createSessionToken } from "@/lib/session-token";
import type { SessionClaims } from "@/types/session";

/**
 * Reading and writing the session cookie.
 *
 * Flags, and why each matters:
 *   httpOnly — script cannot read the cookie, so an XSS foothold cannot exfiltrate
 *              the session.
 *   sameSite lax — the cookie is withheld on cross-site POSTs, which is the primary
 *              CSRF defence for server actions, while still surviving a normal
 *              top-level navigation back into the app.
 *   secure — HTTPS only. Off in development because localhost is plain HTTP, which
 *              is also why the cookie name has no `__Host-` prefix there.
 *   path / — the cookie must be sent to every route, including sign-out.
 */

export async function setSessionCookie(claims: SessionClaims): Promise<void> {
  const token = createSessionToken(claims);
  const cookieStore = await cookies();

  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: token.value,
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    // maxAge and the signed expiry are kept in step; the signature is what
    // actually enforces the lifetime, since a client can edit cookie metadata.
    maxAge: env.SESSION_MAX_AGE_SECONDS,
  });
}

export async function readSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();

  // Overwritten with an immediate expiry rather than only deleted, so a client
  // that ignores deletion still holds nothing usable.
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: 0,
  });
}
