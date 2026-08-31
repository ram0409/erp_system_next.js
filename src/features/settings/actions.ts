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
  emptyCompanyLogoInputSchema,
  updateOrganizationSettingsSchema,
  updatePasswordPolicySchema,
  updateSecurityPolicySchema,
  uploadCompanyLogoSchema,
  type UpdateOrganizationSettingsInput,
  type UpdatePasswordPolicyInput,
  type UpdateSecurityPolicyInput,
} from "@/validations/settings";

function revalidateCompanySurfaces() {
  revalidatePath(ROUTES.SETTINGS_COMPANY);
  revalidatePath(ROUTES.ORGANIZATION);
  revalidatePath("/", "layout");
}

async function persistOrganizationSettings(
  input: UpdateOrganizationSettingsInput,
  actor: ActorContext,
) {
  const data = await settingsService.updateOrganizationSettings(input, actor, {
    userAgent: await getUserAgent(),
  });
  revalidateCompanySurfaces();
  return data;
}

export const updateOrganizationSettingsAction = defineAction({
  name: "settings.update",
  permission: PERMISSIONS.SETTINGS.EDIT,
  schema: updateOrganizationSettingsSchema,
  successMessage: SUCCESS_MESSAGES.UPDATED,
  handler: persistOrganizationSettings,
});

export const uploadCompanyLogoAction = defineAction({
  name: "settings.uploadLogo",
  permission: PERMISSIONS.SETTINGS.EDIT,
  schema: uploadCompanyLogoSchema,
  successMessage: SUCCESS_MESSAGES.LOGO_UPDATED,
  handler: async (input, actor) => {
    const result = await settingsService.uploadCompanyLogo(input.file, actor, {
      userAgent: await getUserAgent(),
    });
    revalidateCompanySurfaces();
    return result;
  },
});

export const removeCompanyLogoAction = defineAction({
  name: "settings.removeLogo",
  permission: PERMISSIONS.SETTINGS.EDIT,
  schema: emptyCompanyLogoInputSchema,
  successMessage: SUCCESS_MESSAGES.LOGO_REMOVED,
  handler: async (_input, actor) => {
    const result = await settingsService.removeCompanyLogo(actor, {
      userAgent: await getUserAgent(),
    });
    revalidateCompanySurfaces();
    return result;
  },
});

export const updateSecurityPolicyAction = defineAction({
  name: "settings.updateSecurityPolicy",
  permission: PERMISSIONS.SETTINGS.EDIT,
  schema: updateSecurityPolicySchema,
  successMessage: SUCCESS_MESSAGES.SECURITY_POLICY_UPDATED,
  handler: async (input: UpdateSecurityPolicyInput, actor) => {
    const data = await settingsService.updateSecurityPolicy(input, actor, {
      userAgent: await getUserAgent(),
    });
    revalidatePath(ROUTES.SETTINGS_SECURITY);
    revalidatePath(ROUTES.USERS);
    return data;
  },
});

export const updatePasswordPolicyAction = defineAction({
  name: "settings.updatePasswordPolicy",
  permission: PERMISSIONS.SETTINGS.EDIT,
  schema: updatePasswordPolicySchema,
  successMessage: SUCCESS_MESSAGES.PASSWORD_POLICY_UPDATED,
  handler: async (input: UpdatePasswordPolicyInput, actor) => {
    const data = await settingsService.updatePasswordPolicy(input, actor, {
      userAgent: await getUserAgent(),
    });
    revalidatePath(ROUTES.SETTINGS_SECURITY);
    revalidatePath(ROUTES.CHANGE_PASSWORD);
    revalidatePath(ROUTES.RESET_PASSWORD);
    return data;
  },
});
