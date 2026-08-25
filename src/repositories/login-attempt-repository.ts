import "server-only";

import { normalizeEmail } from "@/lib/normalize";
import { prisma } from "@/lib/prisma";
import { withPrismaErrors } from "./prisma-errors";

/**
 * Persists every sign-in attempt, including misses. Passwords are never stored.
 *
 * Writes are best-effort: a tracking failure must not turn a valid sign-in into
 * an error, and must not give an attacker a different response from a miss.
 */

export interface RecordLoginAttemptInput {
  readonly emailAttempted: string;
  readonly ipAddress: string | null;
  readonly successful: boolean;
}

export async function record(input: RecordLoginAttemptInput): Promise<boolean> {
  try {
    await prisma.loginAttempt.create({
      data: {
        emailAttempted: input.emailAttempted.slice(0, 160),
        emailNormalized: normalizeEmail(input.emailAttempted).slice(0, 160),
        ipAddress: input.ipAddress,
        successful: input.successful,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export interface CountRecentFailuresInput {
  readonly since: Date;
  readonly ipAddress?: string | null;
  readonly emailAttempted?: string | null;
}

/**
 * Counts unsuccessful attempts in the lockout window. Callers must supply an IP
 * or an email (or both); an empty filter would count the whole table.
 */
export function countRecentFailures(input: CountRecentFailuresInput): Promise<number> {
  const emailNormalized = input.emailAttempted
    ? normalizeEmail(input.emailAttempted)
    : undefined;
  const ipAddress = input.ipAddress ?? undefined;

  if (!emailNormalized && !ipAddress) {
    return Promise.resolve(0);
  }

  // Fail open: a missing model or tracking table must not turn a valid sign-in
  // into INTERNAL_ERROR. Account lockout on the user row still applies.
  return withPrismaErrors("loginAttempt.countRecentFailures", () =>
    prisma.loginAttempt.count({
      where: {
        successful: false,
        createdAt: { gte: input.since },
        ...(emailNormalized ? { emailNormalized } : {}),
        ...(ipAddress ? { ipAddress } : {}),
      },
    }),
  ).catch(() => 0);
}
