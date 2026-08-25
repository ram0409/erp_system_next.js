"use server";

import { revalidatePath } from "next/cache";

import { SUCCESS_MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import { defineAuthenticatedAction } from "@/lib/action";
import * as profileService from "@/services/profile-service";
import { emptyProfileInputSchema, uploadAvatarSchema } from "@/validations/profile";

export const uploadAvatarAction = defineAuthenticatedAction({
  name: "profile.uploadAvatar",
  schema: uploadAvatarSchema,
  successMessage: SUCCESS_MESSAGES.AVATAR_UPDATED,
  handler: async (input, actor) => {
    const result = await profileService.uploadAvatar(
      {
        userId: actor.userId,
        publicId: actor.user.publicId,
        email: actor.user.email,
        firstName: actor.user.firstName,
        lastName: actor.user.lastName,
        ipAddress: actor.ipAddress,
      },
      input.file,
    );

    revalidatePath(ROUTES.PROFILE);
    revalidatePath("/", "layout");

    return result;
  },
});

export const removeAvatarAction = defineAuthenticatedAction({
  name: "profile.removeAvatar",
  schema: emptyProfileInputSchema,
  successMessage: SUCCESS_MESSAGES.AVATAR_REMOVED,
  handler: async (_input, actor) => {
    const result = await profileService.removeAvatar({
      userId: actor.userId,
      publicId: actor.user.publicId,
      email: actor.user.email,
      firstName: actor.user.firstName,
      lastName: actor.user.lastName,
      ipAddress: actor.ipAddress,
    });

    revalidatePath(ROUTES.PROFILE);
    revalidatePath("/", "layout");

    return result;
  },
});
