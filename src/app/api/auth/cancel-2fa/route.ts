import { NextResponse } from "next/server";

import { ROUTES } from "@/constants/routes";
import { clearTwoFactorPendingCookie } from "@/lib/two-factor-pending-cookie";

export const dynamic = "force-dynamic";

/**
 * Clears an unfinished 2FA sign-in and returns to login.
 *
 * Only runs on a real document navigation. App Router RSC prefetches
 * (`?_rsc=` / `rsc: 1`) must not clear the pending cookie — that was wiping
 * the challenge while the verify page was still open.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const isPrefetchOrRsc =
    url.searchParams.has("_rsc") ||
    request.headers.get("rsc") === "1" ||
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch";

  if (!isPrefetchOrRsc) {
    await clearTwoFactorPendingCookie();
  }

  return NextResponse.redirect(new URL(ROUTES.LOGIN, url.origin));
}
