"use server";

import { revalidatePath } from "next/cache";

import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { SUCCESS_MESSAGES } from "@/constants/messages";
import { defineAction } from "@/lib/action";
import { getUserAgent } from "@/lib/request";
import * as settingsService from "@/services/settings-service";
import { updateOrganizationSettingsSchema } from "@/validations/settings";

export const updateOrganizationSettingsAction = defineAction({
  name: "settings.update",
  permission: PERMISSIONS.SETTINGS.EDIT,
  schema: updateOrganizationSettingsSchema,
  successMessage: SUCCESS_MESSAGES.UPDATED,
  handler: async (input, actor) => {
    const data = await settingsService.updateOrganizationSettings(input, actor, {
      userAgent: await getUserAgent(),
    });
    revalidatePath(ROUTES.SETTINGS_GENERAL);
    revalidatePath("/", "layout");
    return data;
  },
});
