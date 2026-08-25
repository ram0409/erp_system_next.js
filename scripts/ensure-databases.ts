import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import pg from "pg";

const envPath = resolve(process.cwd(), ".env");

function parseEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq === -1) {
      continue;
    }
    result[line.slice(0, eq)] = line.slice(eq + 1);
  }
  return result;
}

async function main(): Promise<void> {
  const env = parseEnv(readFileSync(envPath, "utf8"));

  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing from .env");
  }

  const databaseUrl = new URL(env.DATABASE_URL);
  const adminUrl = new URL(env.DATABASE_URL);
  adminUrl.pathname = "/postgres";

  const client = new pg.Client({ connectionString: adminUrl.toString() });

  try {
    await client.connect();
    const version = await client.query("show server_version");
    console.warn(
      `Connected to PostgreSQL ${String(version.rows[0]?.server_version)} at ${databaseUrl.hostname}:${databaseUrl.port}`,
    );

    for (const name of ["erp_dev", "erp_test"] as const) {
      const found = await client.query("select 1 from pg_database where datname = $1", [name]);
      if (found.rowCount === 0) {
        await client.query(`CREATE DATABASE ${name}`);
        console.warn(`Created database ${name}`);
      } else {
        console.warn(`Database ${name} already exists`);
      }
    }
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  console.error("Database connection failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
