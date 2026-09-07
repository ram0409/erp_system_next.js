"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { FormSection } from "@/components/forms/form-section";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateOrganizationSettingsAction } from "@/features/settings/actions";
import {
  PHONE_DIGIT_COUNT,
  enterPlaceholder,
  phoneRegisterOptions,
} from "@/lib/form-fields";
import { applyServerFieldErrors } from "@/lib/form-action-errors";
import type { OrganizationSettings } from "@/types/settings";
import {
  updateOrganizationSettingsSchema,
  type UpdateOrganizationSettingsInput,
} from "@/validations/settings";

function valuesFromSettings(settings: OrganizationSettings): UpdateOrganizationSettingsInput {
  return {
    name: settings.name,
    legalName: settings.legalName ?? "",
    code: settings.code,
    email: settings.email ?? "",
    phone: settings.phone ?? "",
    taxId: settings.taxId ?? "",
    addressLine: settings.addressLine ?? "",
    city: settings.city ?? "",
    state: settings.state ?? "",
    postalCode: settings.postalCode ?? "",
    country: settings.country ?? "",
  };
}

interface GeneralSettingsFormProps {
  readonly settings: OrganizationSettings;
  readonly canEdit: boolean;
}

export function GeneralSettingsForm({ settings, canEdit }: GeneralSettingsFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const formValues = useMemo(() => valuesFromSettings(settings), [settings]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateOrganizationSettingsInput>({
    resolver: zodResolver(updateOrganizationSettingsSchema),
    values: formValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!canEdit) {
      return;
    }
    setFormError(null);

    const result = await updateOrganizationSettingsAction(values);

    if (!result.success) {
      if (result.errors.length > 0) {
        applyServerFieldErrors(result.errors, setError);
      }
      setFormError(result.message);
      return;
    }

    toast.success(result.message);
    router.refresh();
  });

  const disabled = !canEdit || isSubmitting;

  return (
    <Card>
      <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
        <form onSubmit={onSubmit} className="space-y-6" noValidate>
          {formError ? (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/8 text-destructive rounded-xl border px-3 py-2 text-sm"
            >
              {formError}
            </div>
          ) : null}

          <FormSection
            title="Company"
            description="These details identify the company across the administration console."
          >
            <FormField htmlFor="name" label="Name" required error={errors.name?.message}>
              <Input
                id="name"
                autoComplete="organization"
                placeholder={enterPlaceholder("company name")}
                disabled={disabled}
                aria-invalid={errors.name ? true : undefined}
                {...register("name")}
              />
            </FormField>
            <FormField htmlFor="legalName" label="Legal name" error={errors.legalName?.message}>
              <Input
                id="legalName"
                autoComplete="off"
                placeholder={enterPlaceholder("legal name")}
                disabled={disabled}
                aria-invalid={errors.legalName ? true : undefined}
                {...register("legalName")}
              />
            </FormField>
            <FormField
              htmlFor="code"
              label="Code"
              required
              error={errors.code?.message}
              hint="Short unique code used in listings and exports."
            >
              <Input
                id="code"
                autoComplete="off"
                placeholder={enterPlaceholder("company code")}
                disabled={disabled}
                aria-invalid={errors.code ? true : undefined}
                {...register("code")}
              />
            </FormField>
            <FormField htmlFor="taxId" label="Tax ID" error={errors.taxId?.message}>
              <Input
                id="taxId"
                autoComplete="off"
                placeholder={enterPlaceholder("tax ID")}
                disabled={disabled}
                aria-invalid={errors.taxId ? true : undefined}
                {...register("taxId")}
              />
            </FormField>
          </FormSection>

          <FormSection title="Contact">
            <FormField htmlFor="email" label="Email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="off"
                placeholder={enterPlaceholder("email")}
                disabled={disabled}
                aria-invalid={errors.email ? true : undefined}
                {...register("email")}
              />
            </FormField>
            <FormField htmlFor="phone" label="Phone" error={errors.phone?.message}>
              <Input
                id="phone"
                autoComplete="off"
                placeholder={enterPlaceholder("phone number")}
                inputMode="numeric"
                maxLength={PHONE_DIGIT_COUNT}
                disabled={disabled}
                aria-invalid={errors.phone ? true : undefined}
                {...register("phone", phoneRegisterOptions)}
              />
            </FormField>
            <FormField
              htmlFor="addressLine"
              label="Address"
              error={errors.addressLine?.message}
              fullWidth
            >
              <Textarea
                id="addressLine"
                placeholder={enterPlaceholder("address")}
                disabled={disabled}
                aria-invalid={errors.addressLine ? true : undefined}
                {...register("addressLine")}
              />
            </FormField>
            <FormField htmlFor="city" label="City" error={errors.city?.message}>
              <Input
                id="city"
                autoComplete="address-level2"
                placeholder={enterPlaceholder("city")}
                disabled={disabled}
                aria-invalid={errors.city ? true : undefined}
                {...register("city")}
              />
            </FormField>
            <FormField htmlFor="state" label="State" error={errors.state?.message}>
              <Input
                id="state"
                autoComplete="address-level1"
                placeholder={enterPlaceholder("state")}
                disabled={disabled}
                aria-invalid={errors.state ? true : undefined}
                {...register("state")}
              />
            </FormField>
            <FormField htmlFor="postalCode" label="Postal code" error={errors.postalCode?.message}>
              <Input
                id="postalCode"
                autoComplete="postal-code"
                placeholder={enterPlaceholder("postal code")}
                disabled={disabled}
                aria-invalid={errors.postalCode ? true : undefined}
                {...register("postalCode")}
              />
            </FormField>
            <FormField htmlFor="country" label="Country" error={errors.country?.message}>
              <Input
                id="country"
                autoComplete="country-name"
                placeholder={enterPlaceholder("country")}
                disabled={disabled}
                aria-invalid={errors.country ? true : undefined}
                {...register("country")}
              />
            </FormField>
          </FormSection>

          {canEdit ? (
            <FormActions
              isSubmitting={isSubmitting}
              submitLabel="Save changes"
              disableSubmit={!isDirty}
            />
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
