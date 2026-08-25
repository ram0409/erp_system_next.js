import { z } from "zod";

/**
 * Shared by the General Settings form and the update action. Empty optional
 * strings are allowed here and collapsed to `null` in the service.
 */

const organizationCodeSchema = z
  .string()
  .trim()
  .min(1, "Organisation code is required")
  .max(32, "Organisation code is too long")
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "Use letters, numbers, dots, hyphens or underscores only");

const organizationNameSchema = z
  .string()
  .trim()
  .min(1, "Organisation name is required")
  .max(160, "Organisation name is too long");

function optionalText(max: number, tooLong: string) {
  return z.string().trim().max(max, tooLong);
}

const optionalEmailField = z
  .string()
  .trim()
  .max(160, "Email address is too long")
  .refine(
    (value) => value === "" || z.string().email().safeParse(value).success,
    "Enter a valid email address",
  )
  .transform((value) => value.toLowerCase());

const optionalPhoneField = optionalText(32, "Phone number is too long").refine(
  (value) => value === "" || /^[+\d][\d\s().-]*$/.test(value),
  "Enter a valid phone number",
);

export const updateOrganizationSettingsSchema = z.object({
  name: organizationNameSchema,
  legalName: optionalText(200, "Legal name is too long"),
  code: organizationCodeSchema,
  email: optionalEmailField,
  phone: optionalPhoneField,
  taxId: optionalText(64, "Tax ID is too long"),
  addressLine: optionalText(240, "Address is too long"),
  city: optionalText(80, "City is too long"),
  state: optionalText(80, "State is too long"),
  postalCode: optionalText(20, "Postal code is too long"),
  country: optionalText(80, "Country is too long"),
});

export type UpdateOrganizationSettingsInput = z.infer<typeof updateOrganizationSettingsSchema>;
