"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { FormSection } from "@/components/forms/form-section";
import { FormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BRANCH_TYPE_OPTIONS, BRANCH_TYPES } from "@/constants/status";
import { createBranchAction, updateBranchAction } from "@/features/branches/actions";
import type { BranchDetail } from "@/types/branch";
import { createBranchSchema, type CreateBranchInput } from "@/validations/branch";

const EMPTY_VALUES: CreateBranchInput = {
  code: "",
  name: "",
  type: BRANCH_TYPES.REGIONAL_OFFICE,
  isHeadOffice: false,
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

function valuesFromDetail(detail: BranchDetail): CreateBranchInput {
  return {
    code: detail.code,
    name: detail.name,
    type: detail.type,
    isHeadOffice: detail.isHeadOffice,
    email: detail.email ?? "",
    phone: detail.phone ?? "",
    addressLine1: detail.addressLine1 ?? "",
    addressLine2: detail.addressLine2 ?? "",
    city: detail.city ?? "",
    state: detail.state ?? "",
    postalCode: detail.postalCode ?? "",
    country: detail.country ?? "",
  };
}

export type BranchFormMode = "create" | "edit" | "view";

interface BranchFormDialogProps {
  open: boolean;
  mode: BranchFormMode;
  detail: BranchDetail | null;
  isLoading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function BranchFormDialog({
  open,
  mode,
  detail,
  isLoading = false,
  onOpenChange,
  onSuccess,
}: BranchFormDialogProps) {
  const readOnly = mode === "view";
  const [formError, setFormError] = useState<string | null>(null);

  const formValues = useMemo(
    () => (mode === "create" || !detail ? EMPTY_VALUES : valuesFromDetail(detail)),
    [mode, detail],
  );

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CreateBranchInput>({
    resolver: zodResolver(createBranchSchema),
    values: formValues,
  });

  const title =
    mode === "create" ? "Add branch" : mode === "edit" ? "Edit branch" : "Branch details";

  const onSubmit = handleSubmit(async (values) => {
    if (readOnly) {
      return;
    }
    setFormError(null);

    const result =
      mode === "edit" && detail
        ? await updateBranchAction({ ...values, publicId: detail.publicId })
        : await createBranchAction(values);

    if (!result.success) {
      if (result.errors.length > 0) {
        for (const fieldError of result.errors) {
          if (fieldError.field && fieldError.field !== "root") {
            setError(fieldError.field as keyof CreateBranchInput, {
              type: "server",
              message: fieldError.message,
            });
          }
        }
      }
      setFormError(result.message);
      return;
    }

    onSuccess(result.message);
    onOpenChange(false);
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setFormError(null);
        }
        onOpenChange(next);
      }}
      title={title}
      description={
        mode === "create"
          ? "Add a location to the branch network. The code must be unique."
          : mode === "edit"
            ? "Update branch details. Checking head office moves the designation from the current head office."
            : undefined
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
            form="branch-form"
            isSubmitting={isSubmitting || isLoading}
            submitLabel={mode === "create" ? "Create branch" : "Save changes"}
            onCancel={() => onOpenChange(false)}
            disableSubmit={mode === "edit" && !isDirty}
          />
        )
      }
    >
      {isLoading && mode !== "create" && !detail ? (
        <p className="text-muted-foreground text-sm">Loading branch…</p>
      ) : (
        <form id="branch-form" onSubmit={onSubmit} className="space-y-6" noValidate>
          {formError ? (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/8 text-destructive rounded-xl border px-3 py-2 text-sm"
            >
              {formError}
            </div>
          ) : null}

          <FormSection title="Identity">
            <FormField htmlFor="code" label="Code" required error={errors.code?.message}>
              <Input
                id="code"
                autoComplete="off"
                placeholder="Enter the branch code"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.code ? true : undefined}
                aria-describedby={errors.code ? "code-error" : undefined}
                {...register("code")}
              />
            </FormField>
            <FormField htmlFor="name" label="Name" required error={errors.name?.message}>
              <Input
                id="name"
                autoComplete="organization"
                placeholder="Enter the branch name"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? "name-error" : undefined}
                {...register("name")}
              />
            </FormField>
            <FormField htmlFor="type" label="Type" required error={errors.type?.message}>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={readOnly || isSubmitting}
                  >
                    <SelectTrigger
                      id="type"
                      aria-invalid={errors.type ? true : undefined}
                      aria-describedby={errors.type ? "type-error" : undefined}
                    >
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANCH_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <div className="flex items-start gap-2 sm:col-span-2">
              <Controller
                name="isHeadOffice"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="isHeadOffice"
                    checked={field.value}
                    onCheckedChange={(value) => field.onChange(value === true)}
                    disabled={readOnly || isSubmitting || (mode === "edit" && detail?.isHeadOffice)}
                    className="mt-0.5"
                  />
                )}
              />
              <div className="space-y-0.5">
                <label htmlFor="isHeadOffice" className="text-sm font-medium">
                  Head office
                </label>
                <p className="text-muted-foreground text-xs">
                  Only one branch can be the head office. Checking this box moves the designation
                  here.
                </p>
              </div>
            </div>
          </FormSection>

          <FormSection title="Contact">
            <FormField htmlFor="email" label="Email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Enter the email"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? "email-error" : undefined}
                {...register("email")}
              />
            </FormField>
            <FormField htmlFor="phone" label="Mobile number" error={errors.phone?.message}>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="Enter the mobile number"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.phone ? true : undefined}
                aria-describedby={errors.phone ? "phone-error" : undefined}
                {...register("phone")}
              />
            </FormField>
          </FormSection>

          <FormSection title="Address">
            <FormField
              htmlFor="addressLine1"
              label="Address line 1"
              error={errors.addressLine1?.message}
              fullWidth
            >
              <Input
                id="addressLine1"
                autoComplete="address-line1"
                placeholder="Enter the address"
                disabled={readOnly || isSubmitting}
                {...register("addressLine1")}
              />
            </FormField>
            <FormField
              htmlFor="addressLine2"
              label="Address line 2"
              error={errors.addressLine2?.message}
              fullWidth
            >
              <Input
                id="addressLine2"
                autoComplete="address-line2"
                placeholder="Enter the address line 2"
                disabled={readOnly || isSubmitting}
                {...register("addressLine2")}
              />
            </FormField>
            <FormField htmlFor="city" label="City" error={errors.city?.message}>
              <Input
                id="city"
                autoComplete="address-level2"
                placeholder="Enter the city"
                disabled={readOnly || isSubmitting}
                {...register("city")}
              />
            </FormField>
            <FormField htmlFor="state" label="State" error={errors.state?.message}>
              <Input
                id="state"
                autoComplete="address-level1"
                placeholder="Enter the state"
                disabled={readOnly || isSubmitting}
                {...register("state")}
              />
            </FormField>
            <FormField htmlFor="postalCode" label="Postal code" error={errors.postalCode?.message}>
              <Input
                id="postalCode"
                autoComplete="postal-code"
                placeholder="Enter the postal code"
                disabled={readOnly || isSubmitting}
                {...register("postalCode")}
              />
            </FormField>
            <FormField htmlFor="country" label="Country" error={errors.country?.message}>
              <Input
                id="country"
                autoComplete="country-name"
                placeholder="Enter the country"
                disabled={readOnly || isSubmitting}
                {...register("country")}
              />
            </FormField>
          </FormSection>
        </form>
      )}
    </FormDialog>
  );
}
