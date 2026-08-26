"use server";

import { revalidatePath } from "next/cache";

import { defineAuthenticatedAction } from "@/lib/action";
import * as workspaceService from "@/services/workspace-service";
import { setWorkspaceSchema } from "@/validations/workspace";

export const setWorkspaceAction = defineAuthenticatedAction({
  name: "workspace.set",
  schema: setWorkspaceSchema,
  successMessage: "OK",
  handler: async (input) => {
    const data = await workspaceService.setWorkspace(input);
    revalidatePath("/", "layout");
    return data;
  },
});
