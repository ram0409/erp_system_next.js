import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Database liveness used by `/api/health`. Returns false on any failure rather
 * than throwing, so a down database becomes HTTP 503 instead of an unhandled 500.
 */
export async function ping(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
