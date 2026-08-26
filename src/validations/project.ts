import { z } from "zod";

import { PROJECT_MESSAGES } from "@/constants/messages";
import { PROJECT_STATUS_VALUES } from "@/constants/status";
import { publicIdSchema } from "@/validations/org-master";

const optionalDateSchema = z
  .string()
  .trim()
  .max(10)
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Enter a valid date");

const codeSchema = z
  .string()
  .trim()
  .min(1, "Code is required")
  .max(32, "Code is too long")
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
    "Use letters, numbers, dots, hyphens or underscores only",
  );

export const createProjectSchema = z
  .object({
    code: codeSchema,
    name: z.string().trim().min(1, "Name is required").max(160, "Name is too long"),
    description: z.string().trim().max(400, "Description is too long"),
    ownerUserPublicId: z.string().trim().min(1, "Owner is required").max(32),
    startDate: optionalDateSchema,
    endDate: optionalDateSchema,
    status: z.enum(PROJECT_STATUS_VALUES),
  })
  .refine(
    (values) => !values.startDate || !values.endDate || values.endDate >= values.startDate,
    {
      message: PROJECT_MESSAGES.DATE_ORDER,
      path: ["endDate"],
    },
  );
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z
  .object({
    publicId: publicIdSchema,
    code: codeSchema,
    name: z.string().trim().min(1, "Name is required").max(160, "Name is too long"),
    description: z.string().trim().max(400, "Description is too long"),
    ownerUserPublicId: z.string().trim().min(1, "Owner is required").max(32),
    startDate: optionalDateSchema,
    endDate: optionalDateSchema,
    status: z.enum(PROJECT_STATUS_VALUES),
  })
  .refine(
    (values) => !values.startDate || !values.endDate || values.endDate >= values.startDate,
    {
      message: PROJECT_MESSAGES.DATE_ORDER,
      path: ["endDate"],
    },
  );
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const projectPublicIdSchema = z.object({
  publicId: publicIdSchema,
});
