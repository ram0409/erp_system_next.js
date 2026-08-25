import { z } from "zod";

import { RECORD_STATUS_VALUES } from "@/constants/status";
import { passwordSchema, emailSchema } from "@/validations/auth";

/**
 * Shared by the user form and the server actions. Assignment fields are public
 * ids; the service resolves them to internal ids so the client never sees a
 * sequential primary key.
 */

export const publicIdSchema = z
  .string()
  .trim()
  .min(8, "The requested record could not be found.")
  .max(32, "The requested record could not be found.");

const employeeCodeSchema = z
  .string()
  .trim()
  .min(1, "Employee code is required")
  .max(32, "Employee code is too long")
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "Use letters, numbers, dots, hyphens or underscores only");

const personNameSchema = z
  .string()
  .trim()
  .min(1, "This field is required")
  .max(80, "This field is too long");

function optionalText(max: number, tooLong: string) {
  return z.string().trim().max(max, tooLong);
}

const optionalPhoneField = optionalText(32, "Phone number is too long").refine(
  (value) => value === "" || /^[+\d][\d\s().-]*$/.test(value),
  "Enter a valid phone number",
);

const userFieldsSchema = z.object({
  employeeCode: employeeCodeSchema,
  firstName: personNameSchema,
  lastName: personNameSchema,
  email: emailSchema,
  phone: optionalPhoneField,
  designation: optionalText(96, "Designation is too long"),
  branchPublicId: publicIdSchema,
  rolePublicId: publicIdSchema,
});

export const createUserSchema = userFieldsSchema
  .extend({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm the temporary password"),
    mustChangePassword: z.boolean(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = userFieldsSchema.extend({
  publicId: publicIdSchema,
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const userPublicIdSchema = z.object({
  publicId: publicIdSchema,
});

export const exportUsersSchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(RECORD_STATUS_VALUES).optional(),
  branchPublicId: publicIdSchema.optional(),
  rolePublicId: publicIdSchema.optional(),
});
export type ExportUsersInput = z.infer<typeof exportUsersSchema>;
