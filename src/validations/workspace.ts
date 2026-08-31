import { z } from "zod";

const publicIdSchema = z
  .string()
  .trim()
  .min(8, "The requested record could not be found.")
  .max(32, "The requested record could not be found.");

export const setWorkspaceSchema = z.object({
  branchPublicId: publicIdSchema,
});
export type SetWorkspaceInput = z.infer<typeof setWorkspaceSchema>;
