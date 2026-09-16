/**
 * Phone helpers shared by SMS delivery and UI masking.
 * Kept separate from `@/lib/sms` so OTP verify does not load the gateway client.
 */

/**
 * Normalizes a stored phone to E.164.
 * 10-digit local numbers are treated as India (+91).
 */
export function toE164Phone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) {
    return null;
  }

  const digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  if (digits.length >= 11 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

export function maskPhone(phone: string): string {
  const e164 = toE164Phone(phone) ?? phone.replace(/\D/g, "");
  const digits = e164.replace(/\D/g, "");
  if (digits.length < 4) {
    return "••••";
  }
  return `••••${digits.slice(-4)}`;
}
