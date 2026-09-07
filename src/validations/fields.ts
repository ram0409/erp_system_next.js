import { z } from "zod";

import {
  PHONE_DIGIT_COUNT,
  digitsOnly,
  isTenDigitPhone,
} from "@/lib/form-fields";

/**
 * Shared Zod field schemas used by feature validations so phone, email and
 * optional text rules stay identical across the app.
 */

export function optionalText(max: number, tooLong: string) {
  return z.string().trim().max(max, tooLong);
}

export const publicIdSchema = z
  .string()
  .trim()
  .min(8, "The requested record could not be found.")
  .max(32, "The requested record could not be found.");

const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const CODE_PATTERN_MESSAGE = "Use letters, numbers, dots, hyphens or underscores only";

/** Required entity code (customer, branch, employee, company, …). */
export function entityCodeField(label: string, max = 32) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} is too long`)
    .regex(CODE_PATTERN, CODE_PATTERN_MESSAGE);
}

export const optionalAddressFields = {
  addressLine1: optionalText(240, "Address is too long"),
  addressLine2: optionalText(240, "Address is too long"),
  city: optionalText(80, "City is too long"),
  state: optionalText(80, "State is too long"),
  postalCode: optionalText(20, "Postal code is too long"),
  country: optionalText(80, "Country is too long"),
} as const;

export const optionalEmailField = z
  .string()
  .trim()
  .max(160, "Email address is too long")
  .refine(
    (value) => value === "" || z.string().email().safeParse(value).success,
    "Enter a valid email address",
  )
  .transform((value) => value.toLowerCase());

const phoneTooLong = `Phone number must be ${PHONE_DIGIT_COUNT} digits`;
const phoneInvalid = `Enter a valid ${PHONE_DIGIT_COUNT}-digit phone number`;

/** Optional phone: empty, or exactly 10 digits (non-digits are stripped). */
export const optionalPhoneField = z
  .string()
  .trim()
  .transform((value) => digitsOnly(value))
  .refine((value) => value === "" || value.length <= PHONE_DIGIT_COUNT, phoneTooLong)
  .refine((value) => value === "" || isTenDigitPhone(value), phoneInvalid);

/** Required phone: exactly 10 digits. */
export const requiredPhoneField = z
  .string()
  .trim()
  .transform((value) => digitsOnly(value))
  .refine((value) => value.length > 0, "Phone number is required")
  .refine((value) => isTenDigitPhone(value), phoneInvalid);
