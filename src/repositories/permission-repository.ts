import "server-only";

import { prisma } from "@/lib/prisma";
import { withPrismaErrors } from "./prisma-errors";
import type { Prisma } from "@generated/prisma/client";

const CATALOG_SELECT = {
  id: true,
  module: true,
  action: true,
  label: true,
  description: true,
  sortOrder: true,
} satisfies Prisma.PermissionSelect;

export type PermissionRow = Prisma.PermissionGetPayload<{ select: typeof CATALOG_SELECT }>;

/** Every grantable permission, ordered as the matrix renders them. */
export function listCatalog(): Promise<PermissionRow[]> {
  return withPrismaErrors("permission.listCatalog", () =>
    prisma.permission.findMany({
      select: CATALOG_SELECT,
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
  );
}

/**
 * Resolves submitted permission keys to row ids, silently dropping anything the
 * catalog does not contain. The matrix posts keys from the client, so an unknown
 * key is either a stale tab or a forged payload — neither should create a grant.
 */
export function findIdsByKeys(keys: readonly string[]): Promise<number[]> {
  return withPrismaErrors("permission.findIdsByKeys", async () => {
    const pairs = keys
      .map((key) => key.split(":"))
      .filter((parts): parts is [string, string] => parts.length === 2)
      .map(([module, action]) => ({ module, action }));

    if (pairs.length === 0) {
      return [];
    }

    const rows = await prisma.permission.findMany({
      where: { OR: pairs },
      select: { id: true },
    });

    return rows.map((row) => row.id);
  });
}

export function countAll(): Promise<number> {
  return withPrismaErrors("permission.countAll", () => prisma.permission.count());
}
