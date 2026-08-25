import "server-only";

import { ERROR_MESSAGES, PROFILE_MESSAGES } from "@/constants/messages";
import { AUDIT_ACTIONS } from "@/constants/status";
import { buildAvatarPublicPath, detectAvatarExtension } from "@/lib/avatar";
import { deleteAvatarFile, writeAvatarFile } from "@/lib/avatar-storage";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import * as auditRepository from "@/repositories/audit-repository";
import * as userRepository from "@/repositories/user-repository";
import { formatFullName } from "@/utils/format";

interface AvatarActor {
  readonly userId: number;
  readonly publicId: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly ipAddress: string | null;
}

export async function uploadAvatar(actor: AvatarActor, file: File): Promise<{ avatarUrl: string }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = detectAvatarExtension(bytes, file.type);

  if (!extension) {
    throw new ValidationError(PROFILE_MESSAGES.AVATAR_INVALID, {
      fieldErrors: [{ field: "file", message: PROFILE_MESSAGES.AVATAR_INVALID }],
    });
  }

  const current = await userRepository.findAvatarPath(actor.userId);
  if (!current) {
    throw new NotFoundError(ERROR_MESSAGES.NOT_FOUND);
  }

  const publicPath = buildAvatarPublicPath(actor.publicId, extension, Date.now());
  await writeAvatarFile(publicPath, bytes);

  try {
    await userRepository.updateAvatarPath(actor.userId, publicPath);
  } catch (error) {
    await deleteAvatarFile(publicPath);
    throw error;
  }

  if (current.avatarPath && current.avatarPath !== publicPath) {
    await deleteAvatarFile(current.avatarPath);
  }

  await writeAvatarAudit(actor, "Updated profile photo");

  return { avatarUrl: publicPath };
}

export async function removeAvatar(actor: AvatarActor): Promise<{ avatarUrl: null }> {
  const current = await userRepository.findAvatarPath(actor.userId);
  if (!current) {
    throw new NotFoundError(ERROR_MESSAGES.NOT_FOUND);
  }

  await userRepository.updateAvatarPath(actor.userId, null);
  await deleteAvatarFile(current.avatarPath);
  await writeAvatarAudit(actor, "Removed profile photo");

  return { avatarUrl: null };
}

async function writeAvatarAudit(actor: AvatarActor, summary: string): Promise<void> {
  const recorded = await auditRepository.record({
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    actorEmail: actor.email,
    actorName: formatFullName(actor.firstName, actor.lastName),
    entityType: "User",
    entityId: actor.userId,
    entityPublicId: actor.publicId,
    summary,
    ipAddress: actor.ipAddress,
  });

  if (!recorded) {
    logger.warn("Avatar change succeeded but the audit row was not written", {
      userPublicId: actor.publicId,
    });
  }
}
