/**
 * Env resolution shared by the Next server (`src/config/env.ts`) and the Prisma
 * CLI (`prisma.config.ts`). No secrets live here — only which variable wins.
 */

export function firstNonEmpty(values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return undefined;
}

export function isLoopbackHost(connectionOrUrl: string): boolean {
  try {
    const hostname = new URL(connectionOrUrl).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
  } catch {
    return false;
  }
}

/** Runtime queries: prefer a pooled URL when a host (Vercel Postgres) provides one. */
export function resolveDatabaseUrl(env: NodeJS.Dict<string> = process.env): string | undefined {
  return firstNonEmpty([env.DATABASE_URL, env.POSTGRES_PRISMA_URL, env.POSTGRES_URL]);
}

/** Migrations cannot run through PgBouncer in transaction mode; prefer a direct URL. */
export function resolveMigrateDatabaseUrl(env: NodeJS.Dict<string> = process.env): string | undefined {
  return firstNonEmpty([
    env.DIRECT_DATABASE_URL,
    env.POSTGRES_URL_NON_POOLING,
    env.DATABASE_URL,
    env.POSTGRES_URL,
    env.POSTGRES_PRISMA_URL,
  ]);
}

function vercelHttpsOrigin(env: NodeJS.Dict<string>): string | undefined {
  const host = firstNonEmpty([env.VERCEL_PROJECT_PRODUCTION_URL, env.VERCEL_URL]);
  if (!host) {
    return undefined;
  }
  return `https://${host.replace(/^https?:\/\//, "")}`;
}

/**
 * On Vercel, a leftover localhost AUTH_URL from `.env` would mint password-reset
 * links that nobody can open. Fall back to the deployment origin instead.
 */
export function resolveAuthUrl(env: NodeJS.Dict<string> = process.env): string | undefined {
  const configured = env.AUTH_URL?.trim();
  const vercelOrigin = env.VERCEL === "1" ? vercelHttpsOrigin(env) : undefined;
  if (vercelOrigin && (!configured || isLoopbackHost(configured))) {
    return vercelOrigin;
  }
  return configured || undefined;
}

export function resolvePublicAppUrl(env: NodeJS.Dict<string> = process.env): string | undefined {
  const configured = env.NEXT_PUBLIC_APP_URL?.trim();
  const vercelOrigin = env.VERCEL === "1" ? vercelHttpsOrigin(env) : undefined;
  if (vercelOrigin && (!configured || isLoopbackHost(configured))) {
    return vercelOrigin;
  }
  return configured || undefined;
}

export function vercelLocalDatabaseMessage(databaseUrl: string, env: NodeJS.Dict<string> = process.env): string | undefined {
  if (env.VERCEL === "1" && isLoopbackHost(databaseUrl)) {
    return "DATABASE_URL points at localhost, which Vercel cannot reach. Set DATABASE_URL to a hosted PostgreSQL URL (Neon, Supabase, Vercel Postgres, or RDS).";
  }
  return undefined;
}
