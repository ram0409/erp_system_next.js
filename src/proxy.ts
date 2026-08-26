import { NextResponse, type NextRequest } from "next/server";

import { CURRENT_PATH_HEADER, SESSION_COOKIE_NAME } from "@/constants/auth";
import {
  isSoftNavigationRequest,
  loginRedirectLocation,
  shouldSendAnonymousToLogin,
} from "@/lib/auth-proxy";
import {
  CSP_NONCE_HEADER,
  HTML_CACHE_CONTROL,
  buildContentSecurityPolicy,
  createCspNonce,
} from "@/lib/security-headers";

/**
 * Cookie-presence redirect, the per-request CSP nonce, and cache policy for HTML.
 *
 * The proxy deliberately does not verify the session or read permissions: it
 * runs before the request reaches a server component, without database access,
 * and a cookie's mere presence proves nothing. Every page and every server
 * action performs the real check against the database, so this layer is a
 * convenience, never a security boundary. Treating it as one is a well-known
 * source of auth bypasses.
 *
 * Visitors who *have* a cookie are not bounced off public routes. An expired or
 * revoked cookie must be allowed to reach `/login`, or the dashboard layout's
 * redirect back to login and a cookie-based bounce form an infinite loop.
 *
 * CSP cannot live in `next.config.ts`: a nonce has to be unique per request, and
 * Next applies it to framework scripts by reading the request CSP / `x-nonce`.
 */
function applyPageSecurity(response: NextResponse, nonce: string): NextResponse {
  const isDevelopment = process.env.NODE_ENV === "development";
  const csp = buildContentSecurityPolicy({ nonce, isDevelopment });

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", HTML_CACHE_CONTROL);

  return response;
}

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);
  const nonce = createCspNonce();
  const isDevelopment = process.env.NODE_ENV === "development";
  const csp = buildContentSecurityPolicy({ nonce, isDevelopment });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CURRENT_PATH_HEADER, pathname);
  requestHeaders.set(CSP_NONCE_HEADER, nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const isSoftNavigation = isSoftNavigationRequest({
    nextAction: request.headers.get("next-action"),
    rsc: request.headers.get("rsc"),
    accept: request.headers.get("accept"),
  });

  if (shouldSendAnonymousToLogin(pathname, hasSessionCookie, { isSoftNavigation })) {
    const location = loginRedirectLocation(request.url, pathname, search);
    const redirectResponse = NextResponse.redirect(new URL(location, request.url));
    return applyPageSecurity(redirectResponse, nonce);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return applyPageSecurity(response, nonce);
}

export const config = {
  /**
   * Pages only. Route handlers are excluded because they authenticate themselves
   * and a cookie-based redirect would turn an unauthenticated API call into a
   * 307 to an HTML page — including the health probe. Excluding `_next` keeps
   * this off the hot path for chunks and images.
   *
   * Prefetches are *not* skipped: the dashboard layout reads `x-current-path`
   * from this proxy, and a skipped prefetch would omit that header.
   */
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp|ico)$).*)"],
};
