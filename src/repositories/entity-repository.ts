import "server-only";

import { prisma } from "@/lib/prisma";
import { withPrismaErrors } from "./prisma-errors";

/**
 * Internal id used to satisfy `Branch.entityId`. The Entity master is not part
 * of the application; this lookup keeps the existing foreign key intact.
 */
export function findPrimaryId(): Promise<number | null> {
  return withPrismaErrors("entity.findPrimaryId", async () => {
    const row = await prisma.businessEntity.findFirst({
      select: { id: true },
      orderBy: { id: "asc" },
    });
    return row?.id ?? null;
  });
}
