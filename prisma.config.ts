import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 reads connection details from here rather than from schema.prisma.
 * `dotenv/config` must be imported first: the Prisma CLI runs outside Next.js and
 * therefore does not load .env on its own.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
