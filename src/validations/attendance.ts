import { z } from "zod";

import { ATTENDANCE_DAY_STATUS_VALUES } from "@/constants/status";
import { publicIdSchema } from "@/validations/org-master";

const dateInputSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");

const timeInputSchema = z
  .string()
  .trim()
  .max(8, "Time is too long")
  .refine(
    (value) => value === "" || /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value),
    "Use HH:mm",
  );

export const createAttendanceSchema = z.object({
  userPublicId: z.string().trim().min(1, "Employee is required").max(32),
  workDate: dateInputSchema,
  status: z.enum(ATTENDANCE_DAY_STATUS_VALUES),
  checkIn: timeInputSchema,
  checkOut: timeInputSchema,
  notes: z.string().trim().max(400, "Notes are too long"),
});
export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;

export const updateAttendanceSchema = createAttendanceSchema.extend({
  publicId: publicIdSchema,
});
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;

export const attendancePublicIdSchema = z.object({
  publicId: publicIdSchema,
});
