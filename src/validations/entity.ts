import { z } from "zod";

const publicIdSchema = z
  .string()
  .trim()
  .min(8, "The requested record could not be found.")
  .max(32, "The requested record could not be found.");

const codeSchema = z
  .string()
  .trim()
  .min(1, "Code is required")
  .max(32, "Code is too long")
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
    "Use letters, numbers, dots, hyphens or underscores only",
  );

const nameSchema = z.string().trim().min(1, "Name is required").max(160, "Name is too long");

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

export const createEntitySchema = z.object({
  code: codeSchema,
  name: nameSchema,
  legalName: optionalText(200, "Legal name is too long"),
  email: optionalEmailField,
  phone: optionalPhoneField,
  taxId: optionalText(64, "Tax ID is too long"),
  addressLine: optionalText(240, "Address is too long"),
  city: optionalText(80, "City is too long"),
  state: optionalText(80, "State is too long"),
  postalCode: optionalText(20, "Postal code is too long"),
  country: optionalText(80, "Country is too long"),
  notes: optionalText(400, "Notes are too long"),
});
export type CreateEntityInput = z.infer<typeof createEntitySchema>;

export const updateEntitySchema = createEntitySchema.extend({
  publicId: publicIdSchema,
});
export type UpdateEntityInput = z.infer<typeof updateEntitySchema>;

export const entityPublicIdSchema = z.object({
  publicId: publicIdSchema,
});
