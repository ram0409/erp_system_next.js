import { CALLBACK_URL_PARAM } from "@/constants/auth";
import { ROUTES } from "@/constants/routes";

/**
 * Login URL with an optional relative return path. Absolute URLs are ignored so
 * a query parameter cannot become an open redirect.
 */
export function loginHref(nextPath?: string | null): string {
  if (!nextPath || nextPath === ROUTES.LOGIN || nextPath.startsWith(`${ROUTES.LOGIN}?`)) {
    return ROUTES.LOGIN;
  }
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return ROUTES.LOGIN;
  }

  const params = new URLSearchParams();
  params.set(CALLBACK_URL_PARAM, nextPath);
  return `${ROUTES.LOGIN}?${params.toString()}`;
}
