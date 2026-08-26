"use server";

import { revalidatePath } from "next/cache";

import { SUCCESS_MESSAGES } from "@/constants/messages";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { defineAction } from "@/lib/action";
import { getUserAgent } from "@/lib/request";
import * as worklogService from "@/services/worklog-service";
import {
  createWorklogSchema,
  updateWorklogSchema,
  worklogPublicIdSchema,
} from "@/validations/worklog";

async function auditMeta() {
  return { userAgent: await getUserAgent() };
}

function revalidateWorklogs(): void {
  revalidatePath(ROUTES.WORKLOGS);
  revalidatePath(ROUTES.TASKS);
}

export const getWorklogAction = defineAction({
  name: "worklogs.get",
  permission: PERMISSIONS.WORKLOGS.VIEW,
  schema: worklogPublicIdSchema,
  successMessage: "OK",
  handler: async (input) => worklogService.getWorklog(input.publicId),
});

export const createWorklogAction = defineAction({
  name: "worklogs.create",
  permission: PERMISSIONS.WORKLOGS.CREATE,
  schema: createWorklogSchema,
  successMessage: SUCCESS_MESSAGES.CREATED,
  handler: async (input, actor) => {
    const data = await worklogService.createWorklog(input, actor, await auditMeta());
    revalidateWorklogs();
    return data;
  },
});

export const updateWorklogAction = defineAction({
  name: "worklogs.update",
  permission: PERMISSIONS.WORKLOGS.EDIT,
  schema: updateWorklogSchema,
  successMessage: SUCCESS_MESSAGES.UPDATED,
  handler: async (input, actor) => {
    const data = await worklogService.updateWorklog(input, actor, await auditMeta());
    revalidateWorklogs();
    return data;
  },
});

export const deleteWorklogAction = defineAction({
  name: "worklogs.delete",
  permission: PERMISSIONS.WORKLOGS.DELETE,
  schema: worklogPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.DELETED,
  handler: async (input, actor) => {
    await worklogService.deleteWorklog(input.publicId, actor, await auditMeta());
    revalidateWorklogs();
    return null;
  },
});
