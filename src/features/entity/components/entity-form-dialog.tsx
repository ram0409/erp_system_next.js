"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { FormSection } from "@/components/forms/form-section";
import { FormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createEntityAction, updateEntityAction } from "@/features/entity/actions";
import type { EntityDetail } from "@/types/entity";
import { createEntitySchema, type CreateEntityInput } from "@/validations/entity";

const EMPTY_VALUES: CreateEntityInput = {
  code: "",
  name: "",
  legalName: "",
  email: "",
  phone: "",
  taxId: "",
  addressLine: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  notes: "",
};

function valuesFromDetail(detail: EntityDetail): CreateEntityInput {
  return {
    code: detail.code,
    name: detail.name,
    legalName: detail.legalName ?? "",
    email: detail.email ?? "",
    phone: detail.phone ?? "",
    taxId: detail.taxId ?? "",
    addressLine: detail.addressLine ?? "",
    city: detail.city ?? "",
    state: detail.state ?? "",
    postalCode: detail.postalCode ?? "",
    country: detail.country ?? "",
    notes: detail.notes ?? "",
  };
}

export type EntityFormMode = "create" | "edit" | "view";

interface EntityFormDialogProps {
  open: boolean;
  mode: EntityFormMode;
  detail: EntityDetail | null;
  isLoading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function EntityFormDialog({
  open,
  mode,
  detail,
  isLoading = false,
  onOpenChange,
  onSuccess,
}: EntityFormDialogProps) {
  const readOnly = mode === "view";
  const [formError, setFormError] = useState<string | null>(null);
  const formValues = useMemo(
    () => (mode === "create" || !detail ? EMPTY_VALUES : valuesFromDetail(detail)),
    [mode, detail],
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CreateEntityInput>({
    resolver: zodResolver(createEntitySchema),
    values: formValues,
  });

  const title =
    mode === "create" ? "Add entity" : mode === "edit" ? "Edit entity" : "Entity details";

  const onSubmit = handleSubmit(async (values) => {
    if (readOnly) return;
    setFormError(null);
    const result =
      mode === "edit" && detail
        ? await updateEntityAction({ ...values, publicId: detail.publicId })
        : await createEntityAction(values);

    if (!result.success) {
      for (const fieldError of result.errors) {
        if (fieldError.field && fieldError.field !== "root") {
          setError(fieldError.field as keyof CreateEntityInput, {
            type: "server",
            message: fieldError.message,
          });
        }
      }
      setFormError(result.message);
      return;
    }

    onSuccess(result.message);
    onOpenChange(false);
  });

  const disabled = readOnly || isSubmitting;

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setFormError(null);
        onOpenChange(next);
      }}
      title={title}
      description={
        mode === "create" ? "Add a legal entity with its registration and contact details." : undefined
      }
      size="lg"
      isSubmitting={isSubmitting}
      footer={
        readOnly ? (
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <FormActions
            form="entity-form"
            isSubmitting={isSubmitting || isLoading}
            submitLabel={mode === "create" ? "Create entity" : "Save changes"}
            onCancel={() => onOpenChange(false)}
            disableSubmit={mode === "edit" && !isDirty}
          />
        )
      }
    >
      {isLoading && mode !== "create" && !detail ? (
        <p className="text-muted-foreground text-sm">Loading entity…</p>
      ) : (
        <form id="entity-form" onSubmit={onSubmit} className="space-y-6" noValidate>
          {formError ? (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/8 text-destructive rounded-xl border px-3 py-2 text-sm"
            >
              {formError}
            </div>
          ) : null}
          <FormSection title="Identity">
            <FormField htmlFor="name" label="Name" required error={errors.name?.message}>
              <Input
                id="name"
                autoComplete="off"
                placeholder="Enter the entity name"
                disabled={disabled}
                aria-invalid={errors.name ? true : undefined}
                {...register("name")}
              />
            </FormField>
            <FormField htmlFor="legalName" label="Legal name" error={errors.legalName?.message}>
              <Input
                id="legalName"
                autoComplete="off"
                placeholder="Enter the legal name"
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
              hint="Short unique code used in listings."
            >
              <Input
                id="code"
                autoComplete="off"
                placeholder="Enter the entity code"
                disabled={disabled}
                aria-invalid={errors.code ? true : undefined}
                {...register("code")}
              />
            </FormField>
            <FormField htmlFor="taxId" label="Tax ID" error={errors.taxId?.message}>
              <Input
                id="taxId"
                autoComplete="off"
                placeholder="Enter the tax ID"
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
                placeholder="Enter the email"
                disabled={disabled}
                aria-invalid={errors.email ? true : undefined}
                {...register("email")}
              />
            </FormField>
            <FormField htmlFor="phone" label="Phone" error={errors.phone?.message}>
              <Input
                id="phone"
                autoComplete="off"
                placeholder="Enter the phone number"
                disabled={disabled}
                aria-invalid={errors.phone ? true : undefined}
                {...register("phone")}
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
                placeholder="Enter the address"
                disabled={disabled}
                aria-invalid={errors.addressLine ? true : undefined}
                {...register("addressLine")}
              />
            </FormField>
            <FormField htmlFor="city" label="City" error={errors.city?.message}>
              <Input
                id="city"
                autoComplete="off"
                placeholder="Enter the city"
                disabled={disabled}
                aria-invalid={errors.city ? true : undefined}
                {...register("city")}
              />
            </FormField>
            <FormField htmlFor="state" label="State" error={errors.state?.message}>
              <Input
                id="state"
                autoComplete="off"
                placeholder="Enter the state"
                disabled={disabled}
                aria-invalid={errors.state ? true : undefined}
                {...register("state")}
              />
            </FormField>
            <FormField htmlFor="postalCode" label="Postal code" error={errors.postalCode?.message}>
              <Input
                id="postalCode"
                autoComplete="off"
                placeholder="Enter the postal code"
                disabled={disabled}
                aria-invalid={errors.postalCode ? true : undefined}
                {...register("postalCode")}
              />
            </FormField>
            <FormField htmlFor="country" label="Country" error={errors.country?.message}>
              <Input
                id="country"
                autoComplete="off"
                placeholder="Enter the country"
                disabled={disabled}
                aria-invalid={errors.country ? true : undefined}
                {...register("country")}
              />
            </FormField>
            <FormField htmlFor="notes" label="Notes" error={errors.notes?.message} fullWidth>
              <Textarea
                id="notes"
                placeholder="Enter notes"
                disabled={disabled}
                aria-invalid={errors.notes ? true : undefined}
                {...register("notes")}
              />
            </FormField>
          </FormSection>
        </form>
      )}
    </FormDialog>
  );
}
