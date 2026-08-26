"use server";

import { revalidatePath } from "next/cache";

import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { SUCCESS_MESSAGES } from "@/constants/messages";
import { defineAction } from "@/lib/action";
import { getUserAgent } from "@/lib/request";
import * as settingsService from "@/services/settings-service";
import type { ActorContext } from "@/types/session";
import {
  updateOrganizationSettingsSchema,
  type UpdateOrganizationSettingsInput,
} from "@/validations/settings";

async function persistOrganizationSettings(
  input: UpdateOrganizationSettingsInput,
  actor: ActorContext,
) {
  const data = await settingsService.updateOrganizationSettings(input, actor, {
    userAgent: await getUserAgent(),
  });
  revalidatePath(ROUTES.SETTINGS_GENERAL);
  revalidatePath(ROUTES.ORGANIZATION);
  revalidatePath("/", "layout");
  return data;
}

export const updateOrganizationSettingsAction = defineAction({
  name: "settings.update",
  permission: PERMISSIONS.SETTINGS.EDIT,
  schema: updateOrganizationSettingsSchema,
  successMessage: SUCCESS_MESSAGES.UPDATED,
  handler: persistOrganizationSettings,
});

export const updateOrganizationProfileAction = defineAction({
  name: "organization.update",
  permission: PERMISSIONS.ORGANIZATION.EDIT,
  schema: updateOrganizationSettingsSchema,
  successMessage: SUCCESS_MESSAGES.UPDATED,
  handler: persistOrganizationSettings,
});
