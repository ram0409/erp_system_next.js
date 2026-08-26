"use client";

import { useEffect } from "react";

import { isLeavingForLogin, redirectToLogin } from "@/lib/session-client";

interface SessionExpiryGuardProps {
  readonly expiresAt: string;
}

/**
 * The session cookie is httpOnly, so the browser will not navigate on expiry by
 * itself. This timer matches the signed token lifetime and replaces the page
 * with login when that moment is reached — including after a background tab
 * wakes up past the deadline.
 */
export function SessionExpiryGuard({ expiresAt }: SessionExpiryGuardProps) {
  useEffect(() => {
    function leaveIfExpired() {
      if (isLeavingForLogin()) {
        return;
      }
      if (Date.now() >= new Date(expiresAt).getTime()) {
        redirectToLogin();
      }
    }

    leaveIfExpired();

    const delay = Math.max(0, new Date(expiresAt).getTime() - Date.now());
    const timer = window.setTimeout(leaveIfExpired, delay);

    document.addEventListener("visibilitychange", leaveIfExpired);
    window.addEventListener("focus", leaveIfExpired);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", leaveIfExpired);
      window.removeEventListener("focus", leaveIfExpired);
    };
  }, [expiresAt]);

  return null;
}
