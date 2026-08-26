import { z } from "zod";

import { TASK_STATUS_VALUES } from "@/constants/status";
import { publicIdSchema } from "@/validations/org-master";

const optionalDateSchema = z
  .string()
  .trim()
  .max(10)
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Enter a valid date");

export const createTaskSchema = z.object({
  projectPublicId: z.string().trim().min(1, "Project is required").max(32),
  title: z.string().trim().min(1, "Title is required").max(160, "Title is too long"),
  description: z.string().trim().max(400, "Description is too long"),
  assigneeUserPublicId: z.string().trim().max(32),
  dueDate: optionalDateSchema,
  status: z.enum(TASK_STATUS_VALUES),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  publicId: publicIdSchema,
  projectPublicId: z.string().trim().min(1, "Project is required").max(32),
  title: z.string().trim().min(1, "Title is required").max(160, "Title is too long"),
  description: z.string().trim().max(400, "Description is too long"),
  assigneeUserPublicId: z.string().trim().max(32),
  dueDate: optionalDateSchema,
  status: z.enum(TASK_STATUS_VALUES),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const taskPublicIdSchema = z.object({
  publicId: publicIdSchema,
});
