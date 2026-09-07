import { z } from "zod";

import { RECORD_STATUS_VALUES } from "@/constants/status";
import { emailSchema } from "@/validations/auth";
import { entityCodeField, optionalPhoneField, publicIdSchema } from "@/validations/fields";

export { publicIdSchema };

/**
 * Shared by the user form and the server actions. Assignment fields are public
 * ids; the service resolves them to internal ids so the client never sees a
 * sequential primary key.
 */

const personNameSchema = z
  .string()
  .trim()
  .min(1, "This field is required")
  .max(80, "This field is too long");

const userFieldsSchema = z.object({
  employeeCode: entityCodeField("Employee code"),
  firstName: personNameSchema,
  lastName: personNameSchema,
  email: emailSchema,
  phone: optionalPhoneField,
  joinDate: z.string().trim().max(10),
  branchPublicId: publicIdSchema,
  rolePublicId: publicIdSchema,
});

export const createUserSchema = userFieldsSchema;
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
  excludeSuperAdmin: z.boolean().optional(),
});
export type ExportUsersInput = z.infer<typeof exportUsersSchema>;
