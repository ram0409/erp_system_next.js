import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
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

function upsertEnv(text: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(text)) {
    return text.replace(pattern, line);
  }
  return `${text.trimEnd()}\n${line}\n`;
}

function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*-_=+";
  const all = upper + lower + digits + symbols;
  const pick = (source: string): string => source[randomBytes(1)[0]! % source.length]!;
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < 16) {
    chars.push(pick(all));
  }
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swap = randomBytes(1)[0]! % (index + 1);
    const current = chars[index]!;
    chars[index] = chars[swap]!;
    chars[swap] = current;
  }
  return chars.join("");
}

async function main(): Promise<void> {
  let envText = readFileSync(envPath, "utf8");
  const env = parseEnv(envText);

  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing from .env");
  }

  envText = upsertEnv(envText, "SEED_ADMIN_EMAIL", "systemadmin@sample.com");
  envText = upsertEnv(envText, "SEED_ADMIN_EMPLOYEE_CODE", "systemadmin.sample");
  envText = upsertEnv(envText, "SEED_ADMIN_FIRST_NAME", "System");
  envText = upsertEnv(envText, "SEED_ADMIN_LAST_NAME", "Administrator");

  if (!env.SEED_ADMIN_PASSWORD || env.SEED_ADMIN_PASSWORD.trim() === "") {
    envText = upsertEnv(envText, "SEED_ADMIN_PASSWORD", generatePassword());
  }

  writeFileSync(envPath, envText);

  const refreshed = parseEnv(envText);
  const databaseUrl = new URL(refreshed.DATABASE_URL!);
  const adminUrl = new URL(refreshed.DATABASE_URL!);
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
