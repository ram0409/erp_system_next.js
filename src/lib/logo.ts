import { SETTINGS_MESSAGES } from "@/constants/messages";
import { detectAvatarExtension, type AvatarExtension } from "@/lib/avatar";

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_PUBLIC_PREFIX = "/uploads/logos";

export const LOGO_MIME_TO_EXTENSION = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type LogoExtension = AvatarExtension;

const LOGO_PATH_PATTERN = /^\/uploads\/logos\/[a-z0-9]+-\d+\.(jpg|png|webp)$/i;

/** Confirms the bytes match a declared JPEG, PNG or WEBP type. MIME alone is not trusted. */
export function detectLogoExtension(bytes: Uint8Array, declaredType: string): LogoExtension | null {
  return detectAvatarExtension(bytes, declaredType);
}

export function logoRejectionMessage(file: {
  readonly size: number;
  readonly type: string;
}): string | null {
  if (file.size === 0) {
    return SETTINGS_MESSAGES.LOGO_EMPTY;
  }
  if (file.size > LOGO_MAX_BYTES) {
    return SETTINGS_MESSAGES.LOGO_TOO_LARGE;
  }
  if (!(file.type in LOGO_MIME_TO_EXTENSION)) {
    return SETTINGS_MESSAGES.LOGO_TYPE;
  }
  return null;
}

export function buildLogoPublicPath(
  organizationPublicId: string,
  extension: LogoExtension,
  stamp: number,
): string {
  return `${LOGO_PUBLIC_PREFIX}/${organizationPublicId}-${stamp}.${extension}`;
}

/** Only previously written logo paths may be deleted from disk. */
export function isStoredLogoPath(value: string): boolean {
  return LOGO_PATH_PATTERN.test(value);
}
