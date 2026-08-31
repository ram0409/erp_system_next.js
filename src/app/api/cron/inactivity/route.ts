import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { env, isDevelopment } from "@/config/env";
import { logger } from "@/lib/logger";
import { applyInactivityPolicy } from "@/services/inactivity-service";

/**
 * Daily inactivity sweep. Vercel Cron calls GET with
 * `Authorization: Bearer $CRON_SECRET`. Local development may omit the secret.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function bearerMatches(header: string | null, secret: string): boolean {
  const prefix = "Bearer ";
  if (!header?.startsWith(prefix)) {
    return false;
  }

  const received = header.slice(prefix.length);
  const expectedBuffer = Buffer.from(secret, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

function isCronAuthorized(request: Request): boolean {
  const secret = env.CRON_SECRET;
  if (!secret) {
    return isDevelopment;
  }

  return bearerMatches(request.headers.get("authorization"), secret);
}

async function runSweep(request: Request): Promise<NextResponse> {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await applyInactivityPolicy();
    return NextResponse.json({ status: "ok", deactivated: result.deactivated });
  } catch (error) {
    logger.error("Inactivity cron failed", { error });
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

export function GET(request: Request): Promise<NextResponse> {
  return runSweep(request);
}

export function POST(request: Request): Promise<NextResponse> {
  return runSweep(request);
}
