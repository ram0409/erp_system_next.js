"use client";

import { ERROR_CODES } from "@/lib/errors";
import { loginHref } from "@/lib/login-href";
import type { ActionResult } from "@/types/api";

function currentPath(): string {
  return `${window.location.pathname}${window.location.search}`;
}

/** Full navigation so an expired session cannot leave the dashboard shell mounted. */
export function redirectToLogin(nextPath?: string): void {
  window.location.replace(loginHref(nextPath ?? currentPath()));
}

export function redirectIfSessionEnded<T>(result: ActionResult<T>): boolean {
  if (!result.success && result.code === ERROR_CODES.UNAUTHORIZED) {
    redirectToLogin();
    return true;
  }
  return false;
}
