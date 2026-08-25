import { createHash, randomBytes } from "node:crypto";

/**
 * Password-reset tokens are high-entropy random values. Only the SHA-256 hash is
 * stored, so a leaked `password_reset_tokens` row is not redeemable. The
 * plaintext is emailed (or logged in development) once and then discarded.
 */

const TOKEN_BYTES = 32;

export interface IssuedResetToken {
  readonly plaintext: string;
  readonly tokenHash: string;
}

export function hashPasswordResetToken(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

export function issuePasswordResetToken(): IssuedResetToken {
  const plaintext = randomBytes(TOKEN_BYTES).toString("base64url");
  return { plaintext, tokenHash: hashPasswordResetToken(plaintext) };
}
