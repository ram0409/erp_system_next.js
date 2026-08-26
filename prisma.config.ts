import "dotenv/config";
import { defineConfig } from "prisma/config";

import { resolveMigrateDatabaseUrl, sanitizeRuntimeDatabaseUrl } from "./src/config/resolve-env";

/**
 * Prisma 7 reads connection details from here rather than from schema.prisma.
 * `dotenv/config` must be imported first: the Prisma CLI runs outside Next.js and
 * therefore does not load .env on its own.
 *
 * Migrations prefer a direct (non-pooler) URL when Vercel Postgres / Neon expose one.
 */
const datasourceUrl = resolveMigrateDatabaseUrl();

if (!datasourceUrl) {
  throw new Error(
    "DATABASE_URL is required for Prisma CLI commands. Set it, or connect Vercel Postgres (POSTGRES_URL).",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: sanitizeRuntimeDatabaseUrl(datasourceUrl),
  },
});
