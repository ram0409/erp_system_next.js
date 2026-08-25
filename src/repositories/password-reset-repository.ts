import "server-only";

import { prisma } from "@/lib/prisma";
import { withPrismaErrors } from "./prisma-errors";

/**
 * Password reset tokens are stored as hashes. The plaintext token is emailed (or
 * logged in development) and never written here, so a leaked row is not redeemable.
 */

export interface CreateResetTokenInput {
  readonly userId: number;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly requestedIp: string | null;
}

export async function create(input: CreateResetTokenInput): Promise<void> {
  await withPrismaErrors("passwordReset.create", () =>
    prisma.passwordResetToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        requestedIp: input.requestedIp,
      },
    }),
  );
}

export function findActiveByHash(tokenHash: string) {
  return withPrismaErrors("passwordReset.findActiveByHash", () =>
    prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
      },
    }),
  );
}

export async function markUsed(id: number): Promise<void> {
  await withPrismaErrors("passwordReset.markUsed", () =>
    prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    }),
  );
}

/** Invalidates unused tokens for a user after a successful reset or password change. */
export async function invalidateUnusedForUser(userId: number): Promise<void> {
  await withPrismaErrors("passwordReset.invalidateUnusedForUser", () =>
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  );
}

export function countRecentByIp(ipAddress: string, since: Date): Promise<number> {
  return withPrismaErrors("passwordReset.countRecentByIp", () =>
    prisma.passwordResetToken.count({
      where: { requestedIp: ipAddress, createdAt: { gte: since } },
    }),
  );
}

export async function findLatestCreatedAt(userId: number): Promise<Date | null> {
  const row = await withPrismaErrors("passwordReset.findLatestCreatedAt", () =>
    prisma.passwordResetToken.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  );

  return row?.createdAt ?? null;
}
