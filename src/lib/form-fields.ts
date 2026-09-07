/**
 * Shared form copy helpers. Keep placeholders consistent across every form:
 * "Enter the …" for text inputs and "Select …" for selects.
 */

export function enterPlaceholder(fieldName: string): string {
  const label = fieldName.trim();
  if (!label) {
    return "Enter the value";
  }
  return `Enter the ${label}`;
}

export function selectPlaceholder(fieldName: string): string {
  const label = fieldName.trim();
  if (!label) {
    return "Select an option";
  }
  return `Select ${label}`;
}

export const PHONE_DIGIT_COUNT = 10;

/** Digits only, for phone inputs that must be exactly 10 numbers. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function clampPhoneDigits(value: string): string {
  return digitsOnly(value).slice(0, PHONE_DIGIT_COUNT);
}

export function isTenDigitPhone(value: string): boolean {
  return /^\d{10}$/.test(digitsOnly(value));
}

/** RHF register onChange — keeps the visible value to digits only. */
export function phoneDigitsOnChange(event: { target: { value: string } }): void {
  event.target.value = clampPhoneDigits(event.target.value);
}

/** Spread into `register("phone", phoneRegisterOptions)`. */
export const phoneRegisterOptions = {
  onChange: phoneDigitsOnChange,
} as const;

/** Map nullable detail fields into empty strings for controlled form inputs. */
export function nullToEmpty(value: string | null | undefined): string {
  return value ?? "";
}
