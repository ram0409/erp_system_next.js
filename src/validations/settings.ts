import { z } from "zod";

import { SETTINGS_MESSAGES } from "@/constants/messages";
import { PASSWORD_POLICY_IDS } from "@/constants/password-policy";
import { INACTIVITY_POLICY_FORM_VALUES, INACTIVITY_POLICY_OFF } from "@/constants/security";
import { logoRejectionMessage } from "@/lib/logo";

/**
 * Shared by the Company Details form and the update action. Empty optional
 * strings are allowed here and collapsed to `null` in the service.
 */

const organizationCodeSchema = z
  .string()
  .trim()
  .min(1, "Company code is required")
  .max(32, "Company code is too long")
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "Use letters, numbers, dots, hyphens or underscores only");

const organizationNameSchema = z
  .string()
  .trim()
  .min(1, "Company name is required")
  .max(160, "Company name is too long");

function optionalText(max: number, tooLong: string) {
  return z.string().trim().max(max, tooLong);
}

const optionalEmailField = z
  .string()
  .trim()
  .max(160, "Email address is too long")
  .refine(
    (value) => value === "" || z.string().email().safeParse(value).success,
    "Enter a valid email address",
  )
  .transform((value) => value.toLowerCase());

const optionalPhoneField = optionalText(32, "Phone number is too long").refine(
  (value) => value === "" || /^[+\d][\d\s().-]*$/.test(value),
  "Enter a valid phone number",
);

export const updateOrganizationSettingsSchema = z.object({
  name: organizationNameSchema,
  legalName: optionalText(200, "Legal name is too long"),
  code: organizationCodeSchema,
  email: optionalEmailField,
  phone: optionalPhoneField,
  taxId: optionalText(64, "Tax ID is too long"),
  addressLine: optionalText(240, "Address is too long"),
  city: optionalText(80, "City is too long"),
  state: optionalText(80, "State is too long"),
  postalCode: optionalText(20, "Postal code is too long"),
  country: optionalText(80, "Country is too long"),
});

export type UpdateOrganizationSettingsInput = z.infer<typeof updateOrganizationSettingsSchema>;

function isFileLike(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as File).arrayBuffer === "function" &&
    typeof (value as File).size === "number" &&
    typeof (value as File).type === "string"
  );
}

export const uploadCompanyLogoSchema = z.object({
  file: z
    .custom<File>(isFileLike, { message: SETTINGS_MESSAGES.LOGO_REQUIRED })
    .superRefine((file, context) => {
      const message = logoRejectionMessage(file);
      if (message) {
        context.addIssue({ code: "custom", message, path: ["file"] });
      }
    }),
});

export type UploadCompanyLogoInput = z.infer<typeof uploadCompanyLogoSchema>;

export const emptyCompanyLogoInputSchema = z.object({}).default({});

const inactivityPolicyFormValueSchema = z.enum(INACTIVITY_POLICY_FORM_VALUES, {
  error: SETTINGS_MESSAGES.INACTIVITY_DAYS_INVALID,
});

export const updateSecurityPolicyFormSchema = z.object({
  inactivityDeactivateAfterDays: inactivityPolicyFormValueSchema,
});

export type UpdateSecurityPolicyFormValues = z.infer<typeof updateSecurityPolicyFormSchema>;

export const updateSecurityPolicySchema = updateSecurityPolicyFormSchema.transform((data) => ({
  inactivityDeactivateAfterDays:
    data.inactivityDeactivateAfterDays === INACTIVITY_POLICY_OFF
      ? null
      : Number(data.inactivityDeactivateAfterDays),
}));

export type UpdateSecurityPolicyInput = z.output<typeof updateSecurityPolicySchema>;

export const updatePasswordPolicySchema = z.object({
  policy: z.enum(PASSWORD_POLICY_IDS, {
    error: SETTINGS_MESSAGES.PASSWORD_POLICY_INVALID,
  }),
});

export type UpdatePasswordPolicyInput = z.infer<typeof updatePasswordPolicySchema>;
