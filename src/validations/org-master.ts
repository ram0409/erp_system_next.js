import { z } from "zod";

export const publicIdSchema = z
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
const descriptionSchema = z.string().trim().max(400, "Description is too long");

export const createDepartmentSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  description: descriptionSchema,
  branchPublicId: z.string().trim().max(32).optional(),
});
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = createDepartmentSchema.extend({
  publicId: publicIdSchema,
});
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

export const departmentPublicIdSchema = z.object({
  publicId: publicIdSchema,
});

export const createDesignationSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  description: descriptionSchema,
});
export type CreateDesignationInput = z.infer<typeof createDesignationSchema>;

export const updateDesignationSchema = createDesignationSchema.extend({
  publicId: publicIdSchema,
});
export type UpdateDesignationInput = z.infer<typeof updateDesignationSchema>;

export const designationPublicIdSchema = z.object({
  publicId: publicIdSchema,
});
