"use server";

import { revalidatePath } from "next/cache";

import { SUCCESS_MESSAGES } from "@/constants/messages";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { defineAction } from "@/lib/action";
import { getUserAgent } from "@/lib/request";
import * as leaveService from "@/services/leave-service";
import { createLeaveSchema, leavePublicIdSchema, updateLeaveSchema } from "@/validations/leave";

async function auditMeta() {
  return { userAgent: await getUserAgent() };
}

function revalidateLeave(): void {
  revalidatePath(ROUTES.LEAVE);
}

export const getLeaveAction = defineAction({
  name: "leave.get",
  permission: PERMISSIONS.LEAVE.VIEW,
  schema: leavePublicIdSchema,
  successMessage: "OK",
  handler: async (input) => leaveService.getLeave(input.publicId),
});

export const createLeaveAction = defineAction({
  name: "leave.create",
  permission: PERMISSIONS.LEAVE.CREATE,
  schema: createLeaveSchema,
  successMessage: SUCCESS_MESSAGES.CREATED,
  handler: async (input, actor) => {
    const data = await leaveService.createLeave(input, actor, await auditMeta());
    revalidateLeave();
    return data;
  },
});

export const updateLeaveAction = defineAction({
  name: "leave.update",
  permission: PERMISSIONS.LEAVE.EDIT,
  schema: updateLeaveSchema,
  successMessage: SUCCESS_MESSAGES.UPDATED,
  handler: async (input, actor) => {
    const data = await leaveService.updateLeave(input, actor, await auditMeta());
    revalidateLeave();
    return data;
  },
});

export const deleteLeaveAction = defineAction({
  name: "leave.delete",
  permission: PERMISSIONS.LEAVE.DELETE,
  schema: leavePublicIdSchema,
  successMessage: SUCCESS_MESSAGES.DELETED,
  handler: async (input, actor) => {
    await leaveService.deleteLeave(input.publicId, actor, await auditMeta());
    revalidateLeave();
    return null;
  },
});
