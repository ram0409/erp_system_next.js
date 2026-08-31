import "server-only";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { isStoredLogoPath, LOGO_PUBLIC_PREFIX } from "@/lib/logo";
import { logger } from "@/lib/logger";

const LOGO_DIR = path.join(process.cwd(), "public", "uploads", "logos");

function toDiskPath(publicPath: string): string | null {
  if (!isStoredLogoPath(publicPath)) {
    return null;
  }
  const fileName = publicPath.slice(LOGO_PUBLIC_PREFIX.length + 1);
  return path.join(LOGO_DIR, fileName);
}

export async function writeLogoFile(publicPath: string, bytes: Uint8Array): Promise<void> {
  const diskPath = toDiskPath(publicPath);
  if (!diskPath) {
    throw new Error("Refusing to write a logo outside the logo directory.");
  }

  await mkdir(LOGO_DIR, { recursive: true });
  await writeFile(diskPath, bytes);
}

export async function deleteLogoFile(publicPath: string | null): Promise<void> {
  if (!publicPath) {
    return;
  }

  const diskPath = toDiskPath(publicPath);
  if (!diskPath) {
    return;
  }

  try {
    await unlink(diskPath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      logger.warn("Failed to remove a previous logo file", { publicPath, error });
    }
  }
}
