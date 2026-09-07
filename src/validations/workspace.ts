import { z } from "zod";

import { publicIdSchema } from "@/validations/fields";

export const setWorkspaceSchema = z.object({
  branchPublicId: publicIdSchema,
});
export type SetWorkspaceInput = z.infer<typeof setWorkspaceSchema>;
