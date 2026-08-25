"use server";

import { revalidatePath } from "next/cache";

import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { SUCCESS_MESSAGES } from "@/constants/messages";
import { RECORD_STATUS } from "@/constants/status";
import { defineAction } from "@/lib/action";
import { getUserAgent } from "@/lib/request";
import * as userService from "@/services/user-service";
import {
  createUserSchema,
  exportUsersSchema,
  updateUserSchema,
  userPublicIdSchema,
} from "@/validations/user";

async function auditMeta() {
  return { userAgent: await getUserAgent() };
}

function revalidateUsers(): void {
  revalidatePath(ROUTES.USERS);
  revalidatePath("/", "layout");
}

export const getUserAction = defineAction({
  name: "users.get",
  permission: PERMISSIONS.USERS.VIEW,
  schema: userPublicIdSchema,
  successMessage: "OK",
  handler: async (input) => userService.getUser(input.publicId),
});

export const createUserAction = defineAction({
  name: "users.create",
  permission: PERMISSIONS.USERS.CREATE,
  schema: createUserSchema,
  successMessage: SUCCESS_MESSAGES.CREATED,
  handler: async (input, actor) => {
    const data = await userService.createUser(input, actor, await auditMeta());
    revalidateUsers();
    return data;
  },
});

export const updateUserAction = defineAction({
  name: "users.update",
  permission: PERMISSIONS.USERS.EDIT,
  schema: updateUserSchema,
  successMessage: SUCCESS_MESSAGES.UPDATED,
  handler: async (input, actor) => {
    const data = await userService.updateUser(input, actor, await auditMeta());
    revalidateUsers();
    return data;
  },
});

export const activateUserAction = defineAction({
  name: "users.activate",
  permission: PERMISSIONS.USERS.EDIT,
  schema: userPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.ACTIVATED,
  handler: async (input, actor) => {
    const data = await userService.setUserStatus(
      input.publicId,
      RECORD_STATUS.ACTIVE,
      actor,
      await auditMeta(),
    );
    revalidateUsers();
    return data;
  },
});

export const deactivateUserAction = defineAction({
  name: "users.deactivate",
  permission: PERMISSIONS.USERS.EDIT,
  schema: userPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.DEACTIVATED,
  handler: async (input, actor) => {
    const data = await userService.setUserStatus(
      input.publicId,
      RECORD_STATUS.INACTIVE,
      actor,
      await auditMeta(),
    );
    revalidateUsers();
    return data;
  },
});

export const deleteUserAction = defineAction({
  name: "users.delete",
  permission: PERMISSIONS.USERS.DELETE,
  schema: userPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.DELETED,
  handler: async (input, actor) => {
    await userService.deleteUser(input.publicId, actor, await auditMeta());
    revalidateUsers();
    return null;
  },
});

export const sendUserPasswordResetAction = defineAction({
  name: "users.sendPasswordReset",
  permission: PERMISSIONS.USERS.EDIT,
  schema: userPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.PASSWORD_RESET_LINK_SENT,
  handler: async (input, actor) => {
    await userService.sendUserPasswordReset(input.publicId, actor, await auditMeta());
    return null;
  },
});

export const exportUsersAction = defineAction({
  name: "users.export",
  permission: PERMISSIONS.USERS.EXPORT,
  schema: exportUsersSchema,
  successMessage: SUCCESS_MESSAGES.EXPORTED,
  handler: async (input) => userService.exportUsers(input),
});
