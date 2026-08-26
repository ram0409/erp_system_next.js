import { z } from "zod";

import { LEAVE_MESSAGES } from "@/constants/messages";
import { LEAVE_STATUS_VALUES, LEAVE_TYPE_VALUES } from "@/constants/status";
import { publicIdSchema } from "@/validations/org-master";

const dateInputSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");

export const createLeaveSchema = z
  .object({
    userPublicId: z.string().trim().min(1, "Employee is required").max(32),
    type: z.enum(LEAVE_TYPE_VALUES),
    startDate: dateInputSchema,
    endDate: dateInputSchema,
    reason: z.string().trim().max(400, "Reason is too long"),
    status: z.enum(LEAVE_STATUS_VALUES),
  })
  .refine((values) => values.endDate >= values.startDate, {
    message: LEAVE_MESSAGES.DATE_ORDER,
    path: ["endDate"],
  });
export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;

export const updateLeaveSchema = z
  .object({
    publicId: publicIdSchema,
    userPublicId: z.string().trim().min(1, "Employee is required").max(32),
    type: z.enum(LEAVE_TYPE_VALUES),
    startDate: dateInputSchema,
    endDate: dateInputSchema,
    reason: z.string().trim().max(400, "Reason is too long"),
    status: z.enum(LEAVE_STATUS_VALUES),
  })
  .refine((values) => values.endDate >= values.startDate, {
    message: LEAVE_MESSAGES.DATE_ORDER,
    path: ["endDate"],
  });
export type UpdateLeaveInput = z.infer<typeof updateLeaveSchema>;

export const leavePublicIdSchema = z.object({
  publicId: publicIdSchema,
});
