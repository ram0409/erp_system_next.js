"use server";

import { revalidatePath } from "next/cache";

import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { SUCCESS_MESSAGES } from "@/constants/messages";
import { RECORD_STATUS } from "@/constants/status";
import { defineAction } from "@/lib/action";
import { getUserAgent } from "@/lib/request";
import * as entityService from "@/services/entity-service";
import { createEntitySchema, entityPublicIdSchema, updateEntitySchema } from "@/validations/entity";

async function auditMeta() {
  return { userAgent: await getUserAgent() };
}

function revalidateEntities(): void {
  revalidatePath(ROUTES.ENTITY);
  revalidatePath(ROUTES.BRANCHES);
  revalidatePath(ROUTES.DASHBOARD);
  revalidatePath("/", "layout");
}

export const getEntityAction = defineAction({
  name: "entities.get",
  permission: PERMISSIONS.ENTITIES.VIEW,
  schema: entityPublicIdSchema,
  successMessage: "OK",
  handler: async (input) => entityService.getEntity(input.publicId),
});

export const createEntityAction = defineAction({
  name: "entities.create",
  permission: PERMISSIONS.ENTITIES.CREATE,
  schema: createEntitySchema,
  successMessage: SUCCESS_MESSAGES.CREATED,
  handler: async (input, actor) => {
    const data = await entityService.createEntity(input, actor, await auditMeta());
    revalidateEntities();
    return data;
  },
});

export const updateEntityAction = defineAction({
  name: "entities.update",
  permission: PERMISSIONS.ENTITIES.EDIT,
  schema: updateEntitySchema,
  successMessage: SUCCESS_MESSAGES.UPDATED,
  handler: async (input, actor) => {
    const data = await entityService.updateEntity(input, actor, await auditMeta());
    revalidateEntities();
    return data;
  },
});

export const activateEntityAction = defineAction({
  name: "entities.activate",
  permission: PERMISSIONS.ENTITIES.EDIT,
  schema: entityPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.ACTIVATED,
  handler: async (input, actor) => {
    const data = await entityService.setEntityStatus(
      input.publicId,
      RECORD_STATUS.ACTIVE,
      actor,
      await auditMeta(),
    );
    revalidateEntities();
    return data;
  },
});

export const deactivateEntityAction = defineAction({
  name: "entities.deactivate",
  permission: PERMISSIONS.ENTITIES.EDIT,
  schema: entityPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.DEACTIVATED,
  handler: async (input, actor) => {
    const data = await entityService.setEntityStatus(
      input.publicId,
      RECORD_STATUS.INACTIVE,
      actor,
      await auditMeta(),
    );
    revalidateEntities();
    return data;
  },
});

export const deleteEntityAction = defineAction({
  name: "entities.delete",
  permission: PERMISSIONS.ENTITIES.DELETE,
  schema: entityPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.DELETED,
  handler: async (input, actor) => {
    await entityService.deleteEntity(input.publicId, actor, await auditMeta());
    revalidateEntities();
    return null;
  },
});
