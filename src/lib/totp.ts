import "server-only";

import QRCode from "qrcode";
import { generateSecret, generateURI, verifySync } from "otplib";

import { publicEnv } from "@/config/public-env";

export function createAuthenticatorSecret(): string {
  return generateSecret();
}

export function buildAuthenticatorUri(secret: string, email: string): string {
  return generateURI({
    issuer: publicEnv.NEXT_PUBLIC_APP_NAME,
    label: email,
    secret,
  });
}

export async function createAuthenticatorQrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
  });
}

export function verifyAuthenticatorCode(secret: string, code: string): boolean {
  const result = verifySync({ secret, token: code.trim() });
  return result.valid;
}
