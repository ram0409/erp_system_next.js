import { z } from "zod";

import { HOLIDAY_TYPE_VALUES } from "@/constants/status";
import { publicIdSchema } from "@/validations/org-master";

const dateInputSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");

export const createHolidaySchema = z.object({
  holidayDate: dateInputSchema,
  name: z.string().trim().min(1, "Name is required").max(160, "Name is too long"),
  type: z.enum(HOLIDAY_TYPE_VALUES),
  notes: z.string().trim().max(400, "Notes are too long"),
});
export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;

export const updateHolidaySchema = createHolidaySchema.extend({
  publicId: publicIdSchema,
});
export type UpdateHolidayInput = z.infer<typeof updateHolidaySchema>;

export const holidayPublicIdSchema = z.object({
  publicId: publicIdSchema,
});
