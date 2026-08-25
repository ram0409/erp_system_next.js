import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";

import { env, isDevelopment, isProduction } from "@/config/env";
import { PrismaClient } from "@generated/prisma/client";

/**
 * The single Prisma client for the process.
 *
 * Prisma 7 requires an explicit driver adapter, so the `pg` pool is owned here.
 * The instance is cached on `globalThis` so hot reload does not open a new pool
 * on every save. The cache is keyed by the generated `PrismaClient` class: after
 * `prisma generate`, that class identity changes, and a cached client from the
 * previous generate is missing new models (for example `loginAttempt`). Reusing
 * it turns a valid sign-in into INTERNAL_ERROR.
 *
 * Model accessors on Prisma 7 (`prisma.user`, `prisma.loginAttempt`, …) are
 * getters. A Proxy must invoke them with the real client as `this`, otherwise
 * every query is `undefined.count()` and the action wrapper reports INTERNAL_ERROR.
 */

const globalForPrisma = globalThis as unknown as {
  prismaClient?: PrismaClient;
  prismaPool?: Pool;
  prismaClientRef?: typeof PrismaClient;
};

function poolSsl(): boolean | { rejectUnauthorized: boolean } | undefined {
  if (process.env.VERCEL !== "1") {
    return undefined;
  }
  if (/sslmode=disable/i.test(env.DATABASE_URL)) {
    return undefined;
  }
  // Managed Postgres on Vercel/Neon/Supabase requires TLS. Local `next start` is
  // unaffected because VERCEL is unset.
  return { rejectUnauthorized: false };
}

function createPool(): Pool {
  const onVercel = process.env.VERCEL === "1";
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: isProduction ? 10 : 5,
    idleTimeoutMillis: onVercel ? 5_000 : 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: poolSsl(),
  });

  if (onVercel) {
    attachDatabasePool(pool);
  }

  return pool;
}

function createClient(pool: Pool): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg(pool),
    log: isDevelopment ? ["warn", "error"] : ["error"],
  });
}

function clientHasCurrentModels(client: PrismaClient): boolean {
  return typeof client.loginAttempt?.count === "function";
}

function disposeCachedClient(): void {
  const pool = globalForPrisma.prismaPool;
  globalForPrisma.prismaClient = undefined;
  globalForPrisma.prismaPool = undefined;
  globalForPrisma.prismaClientRef = undefined;
  if (pool) {
    void pool.end().catch(() => undefined);
  }
}

function getClient(): PrismaClient {
  const cached = globalForPrisma.prismaClient;
  const generatedClientChanged = globalForPrisma.prismaClientRef !== PrismaClient;
  const stale = !cached || generatedClientChanged || !clientHasCurrentModels(cached);

  if (stale) {
    disposeCachedClient();
    const pool = createPool();
    const client = createClient(pool);
    globalForPrisma.prismaPool = pool;
    globalForPrisma.prismaClient = client;
    globalForPrisma.prismaClientRef = PrismaClient;
    return client;
  }

  return cached;
}

/**
 * A proxy so importers never keep a stale client after `prisma generate`.
 * `export const prisma = cachedInstance` would pin the old object forever.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property, client);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
