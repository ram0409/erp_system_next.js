import { CALLBACK_URL_PARAM } from "@/constants/auth";
import { ROUTES } from "@/constants/routes";

/**
 * Only same-origin relative paths. An absolute URL in `?next=` would be an
 * open redirect to a copy of the login page on someone else's domain.
 */
export function isSafeRelativePath(value: string | null | undefined): value is string {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//"));
}

/**
 * Login URL with an optional relative return path. Absolute URLs are ignored so
 * a query parameter cannot become an open redirect.
 */
export function loginHref(nextPath?: string | null): string {
  if (
    !isSafeRelativePath(nextPath) ||
    nextPath === ROUTES.LOGIN ||
    nextPath.startsWith(`${ROUTES.LOGIN}?`)
  ) {
    return ROUTES.LOGIN;
  }

  const params = new URLSearchParams();
  params.set(CALLBACK_URL_PARAM, nextPath);
  return `${ROUTES.LOGIN}?${params.toString()}`;
}
