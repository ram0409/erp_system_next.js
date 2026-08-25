import { z } from "zod";

import { ALL_PERMISSION_KEYS } from "@/constants/permissions";
import { publicIdSchema } from "@/validations/role";

export const saveRolePermissionsSchema = z.object({
  rolePublicId: publicIdSchema,
  keys: z.array(z.string().trim().min(1).max(80)).max(ALL_PERMISSION_KEYS.length + 8),
});
export type SaveRolePermissionsInput = z.infer<typeof saveRolePermissionsSchema>;
