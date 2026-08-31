import "server-only";

import type { TwoFactorMethod, TwoFactorPurpose } from "@generated/prisma/enums";

import { prisma } from "@/lib/prisma";
import { withPrismaErrors } from "./prisma-errors";

export interface CreateTwoFactorChallengeInput {
  readonly userId: number;
  readonly purpose: TwoFactorPurpose;
  readonly method: TwoFactorMethod;
  readonly codeHash?: string | null;
  readonly secretEnc?: string | null;
  readonly expiresAt: Date;
}

const CHALLENGE_SELECT = {
  id: true,
  publicId: true,
  userId: true,
  purpose: true,
  method: true,
  codeHash: true,
  secretEnc: true,
  expiresAt: true,
  consumedAt: true,
  failedAttempts: true,
  user: {
    select: {
      publicId: true,
      employeeCode: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarPath: true,
      status: true,
      tokenVersion: true,
      mustChangePassword: true,
      emailOtpEnabledAt: true,
      totpEnabledAt: true,
      totpSecretEnc: true,
      role: {
        select: {
          publicId: true,
          slug: true,
          name: true,
          isSuperAdmin: true,
          status: true,
        },
      },
      branch: {
        select: {
          publicId: true,
          code: true,
          name: true,
          status: true,
          deletedAt: true,
        },
      },
    },
  },
} as const;

export type TwoFactorChallengeRow = NonNullable<
  Awaited<ReturnType<typeof findActiveByPublicId>>
>;

export function create(input: CreateTwoFactorChallengeInput): Promise<{
  publicId: string;
  method: TwoFactorMethod;
}> {
  return withPrismaErrors("twoFactor.create", () =>
    prisma.twoFactorChallenge.create({
      data: {
        userId: input.userId,
        purpose: input.purpose,
        method: input.method,
        codeHash: input.codeHash ?? null,
        secretEnc: input.secretEnc ?? null,
        expiresAt: input.expiresAt,
      },
      select: { publicId: true, method: true },
    }),
  );
}

export function findActiveByPublicId(publicId: string) {
  return withPrismaErrors("twoFactor.findActiveByPublicId", () =>
    prisma.twoFactorChallenge.findFirst({
      where: {
        publicId,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: CHALLENGE_SELECT,
    }),
  );
}

export async function consume(id: number): Promise<void> {
  await withPrismaErrors("twoFactor.consume", () =>
    prisma.twoFactorChallenge.update({
      where: { id },
      data: { consumedAt: new Date() },
    }),
  );
}

export async function incrementFailedAttempts(id: number): Promise<number> {
  const row = await withPrismaErrors("twoFactor.incrementFailedAttempts", () =>
    prisma.twoFactorChallenge.update({
      where: { id },
      data: { failedAttempts: { increment: 1 } },
      select: { failedAttempts: true },
    }),
  );

  return row.failedAttempts;
}

export async function invalidatePendingForUser(
  userId: number,
  purpose: TwoFactorPurpose,
): Promise<void> {
  await withPrismaErrors("twoFactor.invalidatePendingForUser", () =>
    prisma.twoFactorChallenge.updateMany({
      where: { userId, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
  );
}

export function findLatestLoginEmailSentAt(userId: number) {
  return withPrismaErrors("twoFactor.findLatestLoginEmailSentAt", () =>
    prisma.twoFactorChallenge.findFirst({
      where: {
        userId,
        purpose: "LOGIN",
        method: "EMAIL",
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  );
}

export function findTwoFactorSettings(userId: number) {
  return withPrismaErrors("twoFactor.findTwoFactorSettings", () =>
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailOtpEnabledAt: true,
        totpEnabledAt: true,
        totpSecretEnc: true,
      },
    }),
  );
}

export async function enableEmailOtp(userId: number): Promise<void> {
  await withPrismaErrors("twoFactor.enableEmailOtp", () =>
    prisma.user.update({
      where: { id: userId },
      data: { emailOtpEnabledAt: new Date() },
    }),
  );
}

export async function disableEmailOtp(userId: number): Promise<void> {
  await withPrismaErrors("twoFactor.disableEmailOtp", () =>
    prisma.user.update({
      where: { id: userId },
      data: { emailOtpEnabledAt: null },
    }),
  );
}

export async function enableTotp(userId: number, secretEnc: string): Promise<void> {
  await withPrismaErrors("twoFactor.enableTotp", () =>
    prisma.user.update({
      where: { id: userId },
      data: {
        totpEnabledAt: new Date(),
        totpSecretEnc: secretEnc,
      },
    }),
  );
}

export async function disableTotp(userId: number): Promise<void> {
  await withPrismaErrors("twoFactor.disableTotp", () =>
    prisma.user.update({
      where: { id: userId },
      data: {
        totpEnabledAt: null,
        totpSecretEnc: null,
      },
    }),
  );
}

export function findLatestActiveForUser(
  userId: number,
  purpose: TwoFactorPurpose,
  method?: TwoFactorMethod,
) {
  return withPrismaErrors("twoFactor.findLatestActiveForUser", () =>
    prisma.twoFactorChallenge.findFirst({
      where: {
        userId,
        purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
        ...(method ? { method } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: CHALLENGE_SELECT,
    }),
  );
}
