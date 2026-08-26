import { z } from "zod";

import { publicIdSchema } from "@/validations/user";

export const emptyNotificationInputSchema = z.object({}).default({});

export const notificationPublicIdSchema = z.object({
  publicId: publicIdSchema,
});
