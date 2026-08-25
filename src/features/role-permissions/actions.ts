"use server";

import { revalidatePath } from "next/cache";

import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { SUCCESS_MESSAGES } from "@/constants/messages";
import { defineAction } from "@/lib/action";
import { getUserAgent } from "@/lib/request";
import * as permissionService from "@/services/permission-service";
import { saveRolePermissionsSchema } from "@/validations/role-permissions";

export const saveRolePermissionsAction = defineAction({
  name: "rolePermissions.save",
  permission: PERMISSIONS.ROLE_PERMISSIONS.EDIT,
  schema: saveRolePermissionsSchema,
  successMessage: SUCCESS_MESSAGES.PERMISSIONS_SAVED,
  handler: async (input, actor) => {
    const data = await permissionService.saveRolePermissions(
      input.rolePublicId,
      input.keys,
      actor,
      { userAgent: await getUserAgent() },
    );

    revalidatePath(ROUTES.ROLE_PERMISSIONS);
    revalidatePath(ROUTES.ROLES);
    revalidatePath("/", "layout");

    return data;
  },
});
