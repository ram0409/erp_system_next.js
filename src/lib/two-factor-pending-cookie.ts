import "server-only";

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

import {
  TWO_FACTOR_PENDING_COOKIE_NAME,
  TWO_FACTOR_PENDING_MAX_AGE_SECONDS,
} from "@/constants/two-factor";
import { env, isProduction } from "@/config/env";

const SEPARATOR = ".";

interface PendingPayload {
  readonly c: string;
  readonly e: number;
  readonly i: number;
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", env.AUTH_SECRET).update(encodedPayload).digest("base64url");
}

function encode(payload: PendingPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decode(encodedPayload: string): PendingPayload | null {
  try {
    const json: unknown = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));

    if (typeof json !== "object" || json === null) {
      return null;
    }

    const { c, e, i } = json as Record<string, unknown>;

    if (typeof c !== "string" || c.length === 0 || typeof e !== "number" || typeof i !== "number") {
      return null;
    }

    return { c, e, i };
  } catch {
    return null;
  }
}

function signaturesMatch(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

function readSignedPayload(token: string, now: Date): PendingPayload | null {
  const parts = token.split(SEPARATOR);
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, signature] = parts as [string, string];

  if (!signaturesMatch(sign(encodedPayload), signature)) {
    return null;
  }

  const payload = decode(encodedPayload);
  if (!payload || payload.e <= now.getTime()) {
    return null;
  }

  if (payload.i > now.getTime() + 60_000) {
    return null;
  }

  return payload;
}

export async function setTwoFactorPendingCookie(challengePublicId: string): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TWO_FACTOR_PENDING_MAX_AGE_SECONDS * 1_000);
  const encodedPayload = encode({
    c: challengePublicId,
    e: expiresAt.getTime(),
    i: now.getTime(),
  });

  const cookieStore = await cookies();
  cookieStore.set({
    name: TWO_FACTOR_PENDING_COOKIE_NAME,
    value: `${encodedPayload}${SEPARATOR}${sign(encodedPayload)}`,
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: TWO_FACTOR_PENDING_MAX_AGE_SECONDS,
  });
}

export async function readTwoFactorPendingCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TWO_FACTOR_PENDING_COOKIE_NAME)?.value ?? "";
  const payload = readSignedPayload(token, new Date());
  return payload?.c ?? null;
}

export async function clearTwoFactorPendingCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set({
    name: TWO_FACTOR_PENDING_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: 0,
  });
}
