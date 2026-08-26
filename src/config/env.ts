import "server-only";

import { z } from "zod";

import { resolveAuthUrl, resolveDatabaseUrl } from "@/config/resolve-env";

/**
 * Server environment. Importing this module from anywhere that can reach a
 * client bundle is a build error, which is what keeps secrets out of the browser.
 *
 * Parsing happens once, at module load, so a misconfigured deployment fails on
 * boot with a readable list of problems rather than throwing on the first query.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL must be a PostgreSQL connection string",
    ),
  TEST_DATABASE_URL: z.string().optional(),

  AUTH_SECRET: z
    .string()
    .min(
      32,
      "AUTH_SECRET must be at least 32 characters — generate one with `openssl rand -base64 32`",
    ),
  AUTH_URL: z.string().url("AUTH_URL must be an absolute URL"),

  SESSION_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(28_800),

  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(5),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().min(1).max(1_440).default(15),

  PASSWORD_RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().min(5).max(1_440).default(30),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Treats empty strings as absent so a blank line in `.env` behaves like an unset variable. */
function readRawEnv(): Record<string, string | undefined> {
  const raw: Record<string, string | undefined> = {};
  for (const key of Object.keys(serverEnvSchema.shape)) {
    const value = process.env[key];
    raw[key] = value === "" ? undefined : value;
  }
  raw.DATABASE_URL = resolveDatabaseUrl();
  raw.AUTH_URL = resolveAuthUrl();
  return raw;
}

function loadServerEnv(): ServerEnv {
  // Escape hatch for image builds and static analysis, where secrets are not yet
  // injected. Never set this in a running environment.
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return readRawEnv() as unknown as ServerEnv;
  }

  const parsed = serverEnvSchema.safeParse(readRawEnv());

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Invalid environment configuration:\n${problems}\n\nCompare your .env against .env.example.`,
    );
  }

  // A leftover laptop DATABASE_URL must not crash `/login` HTML. Anonymous
  // visitors never query Postgres; throwing here produced a 500 with no UI.
  // Queries still fail later until Vercel points at a hosted database.
  return parsed.data;
}

export const env: ServerEnv = loadServerEnv();

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";

/** Mail is optional in development; the reset link is logged instead. */
export const isMailConfigured = Boolean(
  env.SMTP_FROM && (env.SMTP_HOST || env.SMTP_PASSWORD?.startsWith("xkeysib-")),
);
