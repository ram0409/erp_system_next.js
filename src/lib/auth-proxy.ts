import { CALLBACK_URL_PARAM } from "@/constants/auth";
import { PUBLIC_ROUTES, ROUTES } from "@/constants/routes";

/**
 * Cookie-presence routing for `src/proxy.ts`. Kept free of Next request types so
 * the loop-prone cases can be unit-tested: a cookie that exists is not proof of
 * a valid session, and bouncing its holder off `/login` is how a deactivated
 * account (or an expired signature) never reaches a page that can show the form.
 */

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export interface SoftNavigationHeaders {
  readonly nextAction: string | null;
  readonly rsc: string | null;
  readonly accept: string | null;
}

/**
 * Server actions and App Router RSC fetches. An HTTP 307 to `/login` on these
 * is followed as a fetch, so the dashboard stays mounted and Next reports a
 * failed flight instead of signing the user out.
 */
export function isSoftNavigationRequest(headers: SoftNavigationHeaders): boolean {
  if (headers.nextAction) {
    return true;
  }
  if (headers.rsc === "1") {
    return true;
  }
  return headers.accept?.includes("text/x-component") === true;
}

export function shouldSendAnonymousToLogin(
  pathname: string,
  hasSessionCookie: boolean,
  options: { readonly isSoftNavigation?: boolean } = {},
): boolean {
  if (options.isSoftNavigation) {
    return false;
  }
  return !hasSessionCookie && !isPublicPath(pathname);
}

export function loginRedirectLocation(origin: string, pathname: string, search: string): string {
  const loginUrl = new URL(ROUTES.LOGIN, origin);
  loginUrl.searchParams.set(CALLBACK_URL_PARAM, `${pathname}${search}`);
  return loginUrl.pathname + loginUrl.search;
}
