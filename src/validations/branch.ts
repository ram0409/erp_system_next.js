import { z } from "zod";

import { BRANCH_TYPE_VALUES, RECORD_STATUS_VALUES } from "@/constants/status";

/**
 * Shared by the branch form and the server actions. Empty optional strings are
 * allowed here and collapsed to `null` in the service, so a client submit and a
 * server re-parse see the same shape.
 */

export const publicIdSchema = z
  .string()
  .trim()
  .min(8, "The requested record could not be found.")
  .max(32, "The requested record could not be found.");

const branchCodeSchema = z
  .string()
  .trim()
  .min(1, "Branch code is required")
  .max(32, "Branch code is too long")
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
    "Use letters, numbers, dots, hyphens or underscores only",
  );

const branchNameSchema = z
  .string()
  .trim()
  .min(1, "Branch name is required")
  .max(160, "Branch name is too long");

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

export const branchFieldsSchema = z.object({
  entityPublicId: z.string().trim().min(1, "Select an entity").max(32, "Select an entity"),
  code: branchCodeSchema,
  name: branchNameSchema,
  type: z.enum(BRANCH_TYPE_VALUES),
  isHeadOffice: z.boolean(),
  email: optionalEmailField,
  phone: optionalPhoneField,
  addressLine1: optionalText(240, "Address is too long"),
  addressLine2: optionalText(240, "Address is too long"),
  city: optionalText(80, "City is too long"),
  state: optionalText(80, "State is too long"),
  postalCode: optionalText(20, "Postal code is too long"),
  country: optionalText(80, "Country is too long"),
});

export const createBranchSchema = branchFieldsSchema;
export type CreateBranchInput = z.infer<typeof createBranchSchema>;

export const updateBranchSchema = branchFieldsSchema.extend({
  publicId: publicIdSchema,
});
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;

export const branchPublicIdSchema = z.object({
  publicId: publicIdSchema,
});

export const setBranchStatusSchema = z.object({
  publicId: publicIdSchema,
  status: z.enum(RECORD_STATUS_VALUES),
});
export type SetBranchStatusInput = z.infer<typeof setBranchStatusSchema>;

export const exportBranchesSchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(RECORD_STATUS_VALUES).optional(),
  type: z.enum(BRANCH_TYPE_VALUES).optional(),
  entityPublicId: publicIdSchema.optional(),
});
export type ExportBranchesInput = z.infer<typeof exportBranchesSchema>;
