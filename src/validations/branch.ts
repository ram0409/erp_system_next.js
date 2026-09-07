import { z } from "zod";

import { BRANCH_TYPE_VALUES, RECORD_STATUS_VALUES } from "@/constants/status";
import { SETTINGS_MESSAGES } from "@/constants/messages";
import { logoRejectionMessage } from "@/lib/logo";
import {
  entityCodeField,
  optionalAddressFields,
  optionalEmailField,
  optionalPhoneField,
  publicIdSchema,
} from "@/validations/fields";

export { publicIdSchema };

/**
 * Shared by the branch form and the server actions. Empty optional strings are
 * allowed here and collapsed to `null` in the service, so a client submit and a
 * server re-parse see the same shape.
 */

const branchNameSchema = z
  .string()
  .trim()
  .min(1, "Branch name is required")
  .max(160, "Branch name is too long");

export const branchFieldsSchema = z.object({
  code: entityCodeField("Branch code"),
  name: branchNameSchema,
  type: z.enum(BRANCH_TYPE_VALUES),
  isHeadOffice: z.boolean(),
  email: optionalEmailField,
  phone: optionalPhoneField,
  ...optionalAddressFields,
});

export const createBranchSchema = branchFieldsSchema;
export type CreateBranchInput = z.infer<typeof createBranchSchema>;

export const updateBranchSchema = branchFieldsSchema.extend({
  publicId: publicIdSchema,
});
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;

export const branchPublicIdSchema = z.object({
  publicId: publicIdSchema,
});

export const setBranchStatusSchema = z.object({
  publicId: publicIdSchema,
  status: z.enum(RECORD_STATUS_VALUES),
});
export type SetBranchStatusInput = z.infer<typeof setBranchStatusSchema>;

export const exportBranchesSchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(RECORD_STATUS_VALUES).optional(),
  type: z.enum(BRANCH_TYPE_VALUES).optional(),
});
export type ExportBranchesInput = z.infer<typeof exportBranchesSchema>;

function isFileLike(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as File).arrayBuffer === "function" &&
    typeof (value as File).size === "number" &&
    typeof (value as File).type === "string"
  );
}

const logoFileSchema = z
  .custom<File>(isFileLike, { message: SETTINGS_MESSAGES.LOGO_REQUIRED })
  .superRefine((file, context) => {
    const message = logoRejectionMessage(file);
    if (message) {
      context.addIssue({ code: "custom", message, path: ["file"] });
    }
  });

export const uploadBranchLogoSchema = z.object({
  publicId: publicIdSchema,
  file: logoFileSchema,
});

export type UploadBranchLogoInput = z.infer<typeof uploadBranchLogoSchema>;

export const removeBranchLogoSchema = z.object({
  publicId: publicIdSchema,
});
