"use server";

import { revalidatePath } from "next/cache";

import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { SUCCESS_MESSAGES } from "@/constants/messages";
import { RECORD_STATUS } from "@/constants/status";
import { defineAction } from "@/lib/action";
import { getUserAgent } from "@/lib/request";
import * as designationService from "@/services/designation-service";
import {
  createDesignationSchema,
  designationPublicIdSchema,
  updateDesignationSchema,
} from "@/validations/org-master";

async function auditMeta() {
  return { userAgent: await getUserAgent() };
}

function revalidateDesignations(): void {
  revalidatePath(ROUTES.DESIGNATIONS);
  revalidatePath(ROUTES.USERS);
  revalidatePath(ROUTES.PROFILE);
}

export const getDesignationAction = defineAction({
  name: "designations.get",
  permission: PERMISSIONS.DESIGNATIONS.VIEW,
  schema: designationPublicIdSchema,
  successMessage: "OK",
  handler: async (input) => designationService.getDesignation(input.publicId),
});

export const createDesignationAction = defineAction({
  name: "designations.create",
  permission: PERMISSIONS.DESIGNATIONS.CREATE,
  schema: createDesignationSchema,
  successMessage: SUCCESS_MESSAGES.CREATED,
  handler: async (input, actor) => {
    const data = await designationService.createDesignation(input, actor, await auditMeta());
    revalidateDesignations();
    return data;
  },
});

export const updateDesignationAction = defineAction({
  name: "designations.update",
  permission: PERMISSIONS.DESIGNATIONS.EDIT,
  schema: updateDesignationSchema,
  successMessage: SUCCESS_MESSAGES.UPDATED,
  handler: async (input, actor) => {
    const data = await designationService.updateDesignation(input, actor, await auditMeta());
    revalidateDesignations();
    return data;
  },
});

export const activateDesignationAction = defineAction({
  name: "designations.activate",
  permission: PERMISSIONS.DESIGNATIONS.EDIT,
  schema: designationPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.ACTIVATED,
  handler: async (input, actor) => {
    const data = await designationService.setDesignationStatus(
      input.publicId,
      RECORD_STATUS.ACTIVE,
      actor,
      await auditMeta(),
    );
    revalidateDesignations();
    return data;
  },
});

export const deactivateDesignationAction = defineAction({
  name: "designations.deactivate",
  permission: PERMISSIONS.DESIGNATIONS.EDIT,
  schema: designationPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.DEACTIVATED,
  handler: async (input, actor) => {
    const data = await designationService.setDesignationStatus(
      input.publicId,
      RECORD_STATUS.INACTIVE,
      actor,
      await auditMeta(),
    );
    revalidateDesignations();
    return data;
  },
});

export const deleteDesignationAction = defineAction({
  name: "designations.delete",
  permission: PERMISSIONS.DESIGNATIONS.DELETE,
  schema: designationPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.DELETED,
  handler: async (input, actor) => {
    await designationService.deleteDesignation(input.publicId, actor, await auditMeta());
    revalidateDesignations();
    return null;
  },
});
