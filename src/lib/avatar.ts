import { PROFILE_MESSAGES } from "@/constants/messages";

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_PUBLIC_PREFIX = "/uploads/avatars";

export const AVATAR_MIME_TO_EXTENSION = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type AvatarMimeType = keyof typeof AVATAR_MIME_TO_EXTENSION;
export type AvatarExtension = (typeof AVATAR_MIME_TO_EXTENSION)[AvatarMimeType];

const AVATAR_PATH_PATTERN = /^\/uploads\/avatars\/[a-z0-9]+-\d+\.(jpg|png|webp)$/i;

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) {
    return false;
  }
  return signature.every((value, index) => bytes[index] === value);
}

function isJpeg(bytes: Uint8Array): boolean {
  return startsWith(bytes, [0xff, 0xd8, 0xff]);
}

function isPng(bytes: Uint8Array): boolean {
  return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function isWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 12) {
    return false;
  }
  const riff = startsWith(bytes, [0x52, 0x49, 0x46, 0x46]);
  const webp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  return riff && webp;
}

/** Confirms the bytes match a declared JPEG, PNG or WEBP type. MIME alone is not trusted. */
export function detectAvatarExtension(
  bytes: Uint8Array,
  declaredType: string,
): AvatarExtension | null {
  if (declaredType === "image/jpeg" && isJpeg(bytes)) {
    return "jpg";
  }
  if (declaredType === "image/png" && isPng(bytes)) {
    return "png";
  }
  if (declaredType === "image/webp" && isWebp(bytes)) {
    return "webp";
  }
  return null;
}

export function avatarRejectionMessage(file: {
  readonly size: number;
  readonly type: string;
}): string | null {
  if (file.size === 0) {
    return PROFILE_MESSAGES.AVATAR_EMPTY;
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return PROFILE_MESSAGES.AVATAR_TOO_LARGE;
  }
  if (!(file.type in AVATAR_MIME_TO_EXTENSION)) {
    return PROFILE_MESSAGES.AVATAR_TYPE;
  }
  return null;
}

export function buildAvatarPublicPath(
  userPublicId: string,
  extension: AvatarExtension,
  stamp: number,
): string {
  return `${AVATAR_PUBLIC_PREFIX}/${userPublicId}-${stamp}.${extension}`;
}

/** Only previously written avatar paths may be deleted from disk. */
export function isStoredAvatarPath(value: string): boolean {
  return AVATAR_PATH_PATTERN.test(value);
}
