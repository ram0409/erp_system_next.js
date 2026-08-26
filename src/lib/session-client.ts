"use client";

import { ROUTES } from "@/constants/routes";
import { ERROR_CODES } from "@/lib/errors";
import { loginHref } from "@/lib/login-href";
import type { ActionResult } from "@/types/api";

let leavingForLogin = false;

function currentPath(): string {
  return `${window.location.pathname}${window.location.search}`;
}

export function isOnLoginPage(): boolean {
  return window.location.pathname === ROUTES.LOGIN;
}

export function isLeavingForLogin(): boolean {
  return leavingForLogin || isOnLoginPage();
}

/** Full navigation so an expired session cannot leave the dashboard shell mounted. */
export function redirectToLogin(nextPath?: string): void {
  if (isLeavingForLogin()) {
    return;
  }
  leavingForLogin = true;
  window.location.replace(loginHref(nextPath ?? currentPath()));
}

export function redirectIfSessionEnded<T>(result: ActionResult<T>): boolean {
  if (!result.success && result.code === ERROR_CODES.UNAUTHORIZED) {
    redirectToLogin();
    return true;
  }
  return false;
}
