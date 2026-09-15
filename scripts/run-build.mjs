import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Next spawns page-data workers that do not inherit the parent's
 * --max-old-space-size flag. NODE_OPTIONS is inherited, so set it here.
 * Prefer webpack on Windows — Turbopack build has been crashing (access violation).
 */
const heapFlag = "--max-old-space-size=8192";
const existing = process.env.NODE_OPTIONS?.trim() ?? "";
process.env.NODE_OPTIONS = existing.includes("--max-old-space-size")
  ? existing
  : [existing, heapFlag].filter(Boolean).join(" ");

const root = path.dirname(fileURLToPath(import.meta.url));
const nextBin = path.join(root, "..", "node_modules", "next", "dist", "bin", "next");

const result = spawnSync(
  process.execPath,
  [heapFlag, nextBin, "build", "--webpack", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: process.env,
    shell: false,
  },
);

process.exit(result.status ?? 1);
