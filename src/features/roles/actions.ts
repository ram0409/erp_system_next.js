"use server";

import { revalidatePath } from "next/cache";

import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { SUCCESS_MESSAGES } from "@/constants/messages";
import { RECORD_STATUS } from "@/constants/status";
import { defineAction } from "@/lib/action";
import { getUserAgent } from "@/lib/request";
import * as roleService from "@/services/role-service";
import {
  createRoleSchema,
  rolePublicIdSchema,
  updateRoleSchema,
} from "@/validations/role";

async function auditMeta() {
  return { userAgent: await getUserAgent() };
}

function revalidateRoles(): void {
  revalidatePath(ROUTES.ROLES);
}

export const getRoleAction = defineAction({
  name: "roles.get",
  permission: PERMISSIONS.ROLES.VIEW,
  schema: rolePublicIdSchema,
  successMessage: "OK",
  handler: async (input) => roleService.getRole(input.publicId),
});

export const createRoleAction = defineAction({
  name: "roles.create",
  permission: PERMISSIONS.ROLES.CREATE,
  schema: createRoleSchema,
  successMessage: SUCCESS_MESSAGES.CREATED,
  handler: async (input, actor) => {
    const data = await roleService.createRole(input, actor, await auditMeta());
    revalidateRoles();
    return data;
  },
});

export const updateRoleAction = defineAction({
  name: "roles.update",
  permission: PERMISSIONS.ROLES.EDIT,
  schema: updateRoleSchema,
  successMessage: SUCCESS_MESSAGES.UPDATED,
  handler: async (input, actor) => {
    const data = await roleService.updateRole(input, actor, await auditMeta());
    revalidateRoles();
    return data;
  },
});

export const activateRoleAction = defineAction({
  name: "roles.activate",
  permission: PERMISSIONS.ROLES.EDIT,
  schema: rolePublicIdSchema,
  successMessage: SUCCESS_MESSAGES.ACTIVATED,
  handler: async (input, actor) => {
    const data = await roleService.setRoleStatus(
      input.publicId,
      RECORD_STATUS.ACTIVE,
      actor,
      await auditMeta(),
    );
    revalidateRoles();
    return data;
  },
});

export const deactivateRoleAction = defineAction({
  name: "roles.deactivate",
  permission: PERMISSIONS.ROLES.EDIT,
  schema: rolePublicIdSchema,
  successMessage: SUCCESS_MESSAGES.DEACTIVATED,
  handler: async (input, actor) => {
    const data = await roleService.setRoleStatus(
      input.publicId,
      RECORD_STATUS.INACTIVE,
      actor,
      await auditMeta(),
    );
    revalidateRoles();
    return data;
  },
});

export const deleteRoleAction = defineAction({
  name: "roles.delete",
  permission: PERMISSIONS.ROLES.DELETE,
  schema: rolePublicIdSchema,
  successMessage: SUCCESS_MESSAGES.DELETED,
  handler: async (input, actor) => {
    await roleService.deleteRole(input.publicId, actor, await auditMeta());
    revalidateRoles();
    return null;
  },
});
