import "server-only";

import { normalizeCode } from "@/lib/normalize";
import { prisma } from "@/lib/prisma";
import { withPrismaErrors } from "./prisma-errors";
import type { Prisma } from "@generated/prisma/client";

/**
 * This install runs a single organization, seeded as the lowest id. Branch
 * creation needs its internal id, and keeping that lookup here means no service
 * has to hardcode `organizationId: 1`.
 */

const SELECT = {
  id: true,
  publicId: true,
  name: true,
  legalName: true,
  code: true,
  email: true,
  phone: true,
  taxId: true,
  addressLine: true,
  city: true,
  state: true,
  postalCode: true,
  country: true,
  logoPath: true,
  inactivityDeactivateAfterDays: true,
  passwordPolicy: true,
  status: true,
  updatedAt: true,
} satisfies Prisma.OrganizationSelect;

export type OrganizationRow = Prisma.OrganizationGetPayload<{ select: typeof SELECT }>;

export function findPrimary(): Promise<OrganizationRow | null> {
  return withPrismaErrors("organization.findPrimary", () =>
    prisma.organization.findFirst({ select: SELECT, orderBy: { id: "asc" } }),
  );
}

export function findPrimaryId(): Promise<number | null> {
  return withPrismaErrors("organization.findPrimaryId", async () => {
    const row = await prisma.organization.findFirst({
      select: { id: true },
      orderBy: { id: "asc" },
    });
    return row?.id ?? null;
  });
}

export interface UpdateOrganizationInput {
  readonly name: string;
  readonly legalName: string | null;
  readonly code: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly taxId: string | null;
  readonly addressLine: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly postalCode: string | null;
  readonly country: string | null;
}

export function updateById(id: number, input: UpdateOrganizationInput): Promise<OrganizationRow> {
  return withPrismaErrors("organization.updateById", () =>
    prisma.organization.update({
      where: { id },
      data: {
        name: input.name,
        legalName: input.legalName,
        code: input.code,
        codeNormalized: normalizeCode(input.code),
        email: input.email,
        phone: input.phone,
        taxId: input.taxId,
        addressLine: input.addressLine,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        country: input.country,
      },
      select: SELECT,
    }),
  );
}

export function isCodeTaken(code: string, excludeId?: number): Promise<boolean> {
  return withPrismaErrors("organization.isCodeTaken", async () => {
    const row = await prisma.organization.findFirst({
      where: {
        codeNormalized: normalizeCode(code),
        ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    return row !== null;
  });
}

export function updateInactivityDeactivateAfterDays(
  id: number,
  inactivityDeactivateAfterDays: number | null,
): Promise<OrganizationRow> {
  return withPrismaErrors("organization.updateInactivityDeactivateAfterDays", () =>
    prisma.organization.update({
      where: { id },
      data: { inactivityDeactivateAfterDays },
      select: SELECT,
    }),
  );
}

export function updatePasswordPolicy(
  id: number,
  passwordPolicy: string,
): Promise<OrganizationRow> {
  return withPrismaErrors("organization.updatePasswordPolicy", () =>
    prisma.organization.update({
      where: { id },
      data: { passwordPolicy },
      select: SELECT,
    }),
  );
}

export function updateLogoPath(
  id: number,
  logoPath: string | null,
): Promise<{ logoPath: string | null }> {
  return withPrismaErrors("organization.updateLogoPath", () =>
    prisma.organization.update({
      where: { id },
      data: { logoPath },
      select: { logoPath: true },
    }),
  );
}
