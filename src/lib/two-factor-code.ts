import { createHash, randomInt, timingSafeEqual } from "node:crypto";

/** Six-digit email OTP. */
export function generateEmailOtpCode(): string {
  return String(randomInt(100_000, 1_000_000));
}

export function hashEmailOtpCode(code: string): string {
  return createHash("sha256").update(code.trim()).digest("hex");
}

export function verifyEmailOtpCode(code: string, hash: string): boolean {
  const computed = hashEmailOtpCode(code);
  const expected = Buffer.from(computed, "utf8");
  const received = Buffer.from(hash, "utf8");

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}
