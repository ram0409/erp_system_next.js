import { z } from "zod";

import { WORKLOG_MESSAGES } from "@/constants/messages";
import { publicIdSchema } from "@/validations/org-master";

const dateInputSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");

const hoursSchema = z
  .number({ error: WORKLOG_MESSAGES.HOURS_RANGE })
  .refine((value) => Number.isFinite(value), WORKLOG_MESSAGES.HOURS_RANGE)
  .min(0.25, WORKLOG_MESSAGES.HOURS_RANGE)
  .max(24, WORKLOG_MESSAGES.HOURS_RANGE);

export const createWorklogSchema = z.object({
  taskPublicId: z.string().trim().min(1, "Task is required").max(32),
  userPublicId: z.string().trim().min(1, "Employee is required").max(32),
  workDate: dateInputSchema,
  hours: hoursSchema,
  notes: z.string().trim().max(400, "Notes are too long"),
});
export type CreateWorklogInput = z.infer<typeof createWorklogSchema>;

export const updateWorklogSchema = createWorklogSchema.extend({
  publicId: publicIdSchema,
});
export type UpdateWorklogInput = z.infer<typeof updateWorklogSchema>;

export const worklogPublicIdSchema = z.object({
  publicId: publicIdSchema,
});
