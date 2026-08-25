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

export function shouldSendAnonymousToLogin(
  pathname: string,
  hasSessionCookie: boolean,
): boolean {
  return !hasSessionCookie && !isPublicPath(pathname);
}

export function loginRedirectLocation(origin: string, pathname: string, search: string): string {
  const loginUrl = new URL(ROUTES.LOGIN, origin);
  loginUrl.searchParams.set(CALLBACK_URL_PARAM, `${pathname}${search}`);
  return loginUrl.pathname + loginUrl.search;
}
