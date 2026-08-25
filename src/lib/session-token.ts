import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/config/env";
import type { SessionClaims } from "@/types/session";

/**
 * The session cookie: a compact JSON payload with an HMAC-SHA256 signature.
 *
 * Deliberately not a JWT. A JWT would add a header advertising its own algorithm,
 * and honouring that field is the root of the `alg: none` and algorithm-confusion
 * families of bug. Here the algorithm is fixed by this file and not negotiable by
 * the token.
 *
 * The payload carries only an identifier, a token version and an expiry. It holds
 * no permissions and no role, because a cookie is client-side state: anything
 * authorization-relevant inside it would go stale the moment an administrator
 * changed a role, and would be attacker-controlled input if the signature were
 * ever bypassed. Everything else is read from the database per request.
 */

const SEPARATOR = ".";

interface TokenPayload {
  /** User public id. */
  readonly u: string;
  /** Token version, compared against the database to revoke issued cookies. */
  readonly v: number;
  /** Expiry, epoch milliseconds. */
  readonly e: number;
  /** Issued at, epoch milliseconds. */
  readonly i: number;
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", env.AUTH_SECRET).update(encodedPayload).digest("base64url");
}

function encode(payload: TokenPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decode(encodedPayload: string): TokenPayload | null {
  try {
    const json: unknown = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));

    if (typeof json !== "object" || json === null) {
      return null;
    }

    const { u, v, e, i } = json as Record<string, unknown>;

    if (
      typeof u !== "string" ||
      u.length === 0 ||
      typeof v !== "number" ||
      !Number.isInteger(v) ||
      typeof e !== "number" ||
      !Number.isFinite(e) ||
      typeof i !== "number" ||
      !Number.isFinite(i)
    ) {
      return null;
    }

    return { u, v, e, i };
  } catch {
    return null;
  }
}

/** Compares signatures in constant time; `timingSafeEqual` requires equal lengths. */
function signaturesMatch(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export interface IssuedToken {
  readonly value: string;
  readonly expiresAt: Date;
}

export function createSessionToken(claims: SessionClaims, now: Date = new Date()): IssuedToken {
  const expiresAt = new Date(now.getTime() + env.SESSION_MAX_AGE_SECONDS * 1_000);

  const encodedPayload = encode({
    u: claims.userPublicId,
    v: claims.tokenVersion,
    e: expiresAt.getTime(),
    i: now.getTime(),
  });

  return {
    value: `${encodedPayload}${SEPARATOR}${sign(encodedPayload)}`,
    expiresAt,
  };
}

/**
 * Returns the claims only for a token with a valid signature that has not
 * expired. Every failure mode returns null: the caller cannot distinguish a
 * forged token from an expired one, and neither should produce an error message
 * that helps someone probe the format.
 */
export function verifySessionToken(token: string, now: Date = new Date()): SessionClaims | null {
  if (!token) {
    return null;
  }

  const parts = token.split(SEPARATOR);
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, signature] = parts as [string, string];

  if (!signaturesMatch(sign(encodedPayload), signature)) {
    return null;
  }

  // Only decoded after the signature is confirmed, so JSON.parse never sees
  // unauthenticated input.
  const payload = decode(encodedPayload);
  if (!payload) {
    return null;
  }

  if (payload.e <= now.getTime()) {
    return null;
  }

  // A token issued in the future indicates a tampered clock or a replayed cookie
  // from a misconfigured instance; a minute of tolerance covers ordinary skew.
  if (payload.i > now.getTime() + 60_000) {
    return null;
  }

  return { userPublicId: payload.u, tokenVersion: payload.v };
}
