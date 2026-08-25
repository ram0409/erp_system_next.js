import "server-only";

import { headers } from "next/headers";

/**
 * Best-effort client IP for audit rows and login throttling. Proxy headers are
 * spoofable, so this is evidence for review — never an authorization input.
 */
export async function getRequestIp(): Promise<string | null> {
  const headerList = await headers();

  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  return headerList.get("x-real-ip");
}

export async function getUserAgent(): Promise<string | null> {
  const headerList = await headers();
  return headerList.get("user-agent");
}
