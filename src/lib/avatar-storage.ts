import "server-only";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { AVATAR_PUBLIC_PREFIX, isStoredAvatarPath } from "@/lib/avatar";
import { logger } from "@/lib/logger";

const AVATAR_DIR = path.join(process.cwd(), "public", "uploads", "avatars");

function toDiskPath(publicPath: string): string | null {
  if (!isStoredAvatarPath(publicPath)) {
    return null;
  }
  const fileName = publicPath.slice(AVATAR_PUBLIC_PREFIX.length + 1);
  return path.join(AVATAR_DIR, fileName);
}

export async function writeAvatarFile(publicPath: string, bytes: Uint8Array): Promise<void> {
  const diskPath = toDiskPath(publicPath);
  if (!diskPath) {
    throw new Error("Refusing to write an avatar outside the avatar directory.");
  }

  await mkdir(AVATAR_DIR, { recursive: true });
  await writeFile(diskPath, bytes);
}

export async function deleteAvatarFile(publicPath: string | null): Promise<void> {
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
      logger.warn("Failed to remove a previous avatar file", { publicPath, error });
    }
  }
}
