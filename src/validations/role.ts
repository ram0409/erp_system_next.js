import { z } from "zod";

import { normalizeSlug } from "@/lib/normalize";

/**
 * Shared by the role form and the server actions. The slug is normalized in the
 * service so a typed "Sales Manager" and a typed "sales_manager" cannot diverge.
 */

export const publicIdSchema = z
  .string()
  .trim()
  .min(8, "The requested record could not be found.")
  .max(32, "The requested record could not be found.");

const roleNameSchema = z
  .string()
  .trim()
  .min(1, "Role name is required")
  .max(96, "Role name is too long");

const roleSlugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(64, "Slug is too long")
  .refine((value) => normalizeSlug(value).length > 0, "Enter a valid slug");

const roleDescriptionSchema = z.string().trim().max(400, "Description is too long");

export const createRoleSchema = z.object({
  name: roleNameSchema,
  slug: roleSlugSchema,
  description: roleDescriptionSchema,
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  publicId: publicIdSchema,
  name: roleNameSchema,
  description: roleDescriptionSchema,
});
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const rolePublicIdSchema = z.object({
  publicId: publicIdSchema,
});
