import { z } from "zod";

import { RECORD_STATUS_VALUES } from "@/constants/status";

import {
  entityCodeField,
  optionalAddressFields,
  optionalEmailField,
  optionalPhoneField,
  optionalText,
  publicIdSchema,
} from "@/validations/fields";

export { publicIdSchema };

/**
 * Shared by the customer form and the server actions. Empty optional strings are
 * allowed here and collapsed to `null` in the service.
 */

const customerNameSchema = z
  .string()
  .trim()
  .min(1, "Customer name is required")
  .max(160, "Customer name is too long");

export const customerFieldsSchema = z.object({
  code: entityCodeField("Customer code"),
  name: customerNameSchema,
  branchPublicId: publicIdSchema,
  contactPerson: optionalText(120, "Contact person is too long"),
  email: optionalEmailField,
  phone: optionalPhoneField,
  ...optionalAddressFields,
});

export const createCustomerSchema = customerFieldsSchema;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = customerFieldsSchema.extend({
  publicId: publicIdSchema,
});
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const customerPublicIdSchema = z.object({
  publicId: publicIdSchema,
});

export const setCustomerStatusSchema = z.object({
  publicId: publicIdSchema,
  status: z.enum(RECORD_STATUS_VALUES),
});
export type SetCustomerStatusInput = z.infer<typeof setCustomerStatusSchema>;

export const exportCustomersSchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(RECORD_STATUS_VALUES).optional(),
});
export type ExportCustomersInput = z.infer<typeof exportCustomersSchema>;
