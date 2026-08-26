import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { type PoolConfig } from "pg";

import { env, isDevelopment, isProduction } from "@/config/env";
import { isLoopbackHost, sanitizeRuntimeDatabaseUrl } from "@/config/resolve-env";
import { PrismaClient } from "@generated/prisma/client";

/**
 * The single Prisma client for the process.
 *
 * Prisma 7 requires an explicit driver adapter. The adapter is given a pool
 * *config*, not a `pg.Pool` instance: `PrismaPg` uses `instanceof Pool`, and a
 * second copy of `pg` on Vercel makes that check fail, which turns sign-in into
 * INTERNAL_ERROR.
 *
 * The instance is cached on `globalThis` so hot reload does not open a new pool
 * on every save. The cache is keyed by the generated `PrismaClient` class: after
 * `prisma generate`, that class identity changes, and a cached client from the
 * previous generate is missing new models.
 */

const globalForPrisma = globalThis as unknown as {
  prismaClient?: PrismaClient;
  prismaClientRef?: typeof PrismaClient;
};

function poolSsl(connectionString: string): PoolConfig["ssl"] {
  if (isLoopbackHost(connectionString) || /sslmode=disable/i.test(connectionString)) {
    return undefined;
  }
  // Managed Postgres (Neon, Supabase, RDS) requires TLS. `rejectUnauthorized`
  // is false because serverless runtimes do not always ship the host CA bundle.
  return { rejectUnauthorized: false };
}

function poolConfig(): PoolConfig {
  const onVercel = process.env.VERCEL === "1";
  const connectionString = sanitizeRuntimeDatabaseUrl(env.DATABASE_URL);

  return {
    connectionString,
    max: onVercel ? 1 : isProduction ? 10 : 5,
    idleTimeoutMillis: onVercel ? 5_000 : 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: poolSsl(connectionString),
  };
}

function createClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg(poolConfig()),
    log: isDevelopment ? ["warn", "error"] : ["error"],
  });
}

function clientHasCurrentModels(client: PrismaClient): boolean {
  return typeof client.loginAttempt?.count === "function";
}

function disposeCachedClient(): void {
  globalForPrisma.prismaClient = undefined;
  globalForPrisma.prismaClientRef = undefined;
}

function getClient(): PrismaClient {
  const cached = globalForPrisma.prismaClient;
  const generatedClientChanged = globalForPrisma.prismaClientRef !== PrismaClient;
  const stale = !cached || generatedClientChanged || !clientHasCurrentModels(cached);

  if (stale) {
    disposeCachedClient();
    const client = createClient();
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
  get(_target, property, receiver) {
    const client = getClient();
    const value = Reflect.get(client, property, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
