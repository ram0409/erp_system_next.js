import { z } from "zod";

import { PROFILE_MESSAGES } from "@/constants/messages";
import { avatarRejectionMessage } from "@/lib/avatar";

function isFileLike(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as File).arrayBuffer === "function" &&
    typeof (value as File).size === "number" &&
    typeof (value as File).type === "string"
  );
}

export const uploadAvatarSchema = z.object({
  file: z
    .custom<File>(isFileLike, { message: PROFILE_MESSAGES.AVATAR_REQUIRED })
    .superRefine((file, context) => {
      const message = avatarRejectionMessage(file);
      if (message) {
        context.addIssue({ code: "custom", message, path: ["file"] });
      }
    }),
});

export type UploadAvatarInput = z.infer<typeof uploadAvatarSchema>;

export const emptyProfileInputSchema = z.object({}).default({});
