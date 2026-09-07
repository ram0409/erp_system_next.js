"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { FormSection } from "@/components/forms/form-section";
import { FormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCustomerAction,
  updateCustomerAction,
} from "@/features/customers/actions";
import {
  PHONE_DIGIT_COUNT,
  enterPlaceholder,
  phoneRegisterOptions,
  selectPlaceholder,
} from "@/lib/form-fields";
import { applyServerFieldErrors } from "@/lib/form-action-errors";
import type { CustomerBranchOption, CustomerDetail } from "@/types/customer";
import { createCustomerSchema, type CreateCustomerInput } from "@/validations/customer";

const EMPTY_VALUES: CreateCustomerInput = {
  code: "",
  name: "",
  branchPublicId: "",
  contactPerson: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

function valuesFromDetail(detail: CustomerDetail): CreateCustomerInput {
  return {
    code: detail.code,
    name: detail.name,
    branchPublicId: detail.branch.publicId.trim(),
    contactPerson: detail.contactPerson ?? "",
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

export type CustomerFormMode = "create" | "edit" | "view";

interface CustomerFormDialogProps {
  open: boolean;
  mode: CustomerFormMode;
  detail: CustomerDetail | null;
  isLoading?: boolean;
  branches: readonly CustomerBranchOption[];
  defaultBranchPublicId?: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function CustomerFormDialog({
  open,
  mode,
  detail,
  isLoading = false,
  branches,
  defaultBranchPublicId = "",
  onOpenChange,
  onSuccess,
}: CustomerFormDialogProps) {
  const readOnly = mode === "view";
  const [formError, setFormError] = useState<string | null>(null);

  const formValues = useMemo(() => {
    if (mode === "create" || !detail) {
      return {
        ...EMPTY_VALUES,
        branchPublicId: defaultBranchPublicId || branches[0]?.publicId || "",
      };
    }
    return valuesFromDetail(detail);
  }, [mode, detail, defaultBranchPublicId, branches]);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema),
    values: formValues,
  });

  const title =
    mode === "create" ? "Add customer" : mode === "edit" ? "Edit customer" : "Customer details";

  const onSubmit = handleSubmit(async (values) => {
    if (readOnly) {
      return;
    }
    setFormError(null);

    const result =
      mode === "edit" && detail
        ? await updateCustomerAction({ ...values, publicId: detail.publicId })
        : await createCustomerAction(values);

    if (!result.success) {
      if (result.errors.length > 0) {
        applyServerFieldErrors(result.errors, setError);
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
          ? "Add a customer under a branch. The code must be unique."
          : mode === "edit"
            ? "Update customer details, branch and contact information."
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
            form="customer-form"
            isSubmitting={isSubmitting || isLoading}
            submitLabel={mode === "create" ? "Create customer" : "Save changes"}
            onCancel={() => onOpenChange(false)}
            disableSubmit={mode === "edit" && !isDirty}
          />
        )
      }
    >
      {isLoading && mode !== "create" && !detail ? (
        <p className="text-muted-foreground text-sm">Loading customer…</p>
      ) : (
        <form id="customer-form" onSubmit={onSubmit} className="space-y-6" noValidate>
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
                placeholder={enterPlaceholder("customer code")}
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.code ? true : undefined}
                {...register("code")}
              />
            </FormField>
            <FormField htmlFor="name" label="Name" required error={errors.name?.message}>
              <Input
                id="name"
                autoComplete="organization"
                placeholder={enterPlaceholder("customer name")}
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.name ? true : undefined}
                {...register("name")}
              />
            </FormField>
            <FormField
              htmlFor="branchPublicId"
              label="Branch"
              required
              error={errors.branchPublicId?.message}
            >
              <Controller
                name="branchPublicId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={readOnly || isSubmitting || branches.length === 0}
                  >
                    <SelectTrigger
                      id="branchPublicId"
                      aria-invalid={errors.branchPublicId ? true : undefined}
                    >
                      <SelectValue placeholder={selectPlaceholder("branch")} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.publicId} value={branch.publicId}>
                          {branch.name} ({branch.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField
              htmlFor="contactPerson"
              label="Contact person"
              error={errors.contactPerson?.message}
            >
              <Input
                id="contactPerson"
                autoComplete="name"
                placeholder={enterPlaceholder("contact person")}
                disabled={readOnly || isSubmitting}
                {...register("contactPerson")}
              />
            </FormField>
          </FormSection>

          <FormSection title="Contact">
            <FormField htmlFor="email" label="Email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={enterPlaceholder("email")}
                disabled={readOnly || isSubmitting}
                {...register("email")}
              />
            </FormField>
            <FormField htmlFor="phone" label="Phone" error={errors.phone?.message}>
              <Input
                id="phone"
                autoComplete="tel"
                placeholder={enterPlaceholder("phone number")}
                inputMode="numeric"
                maxLength={PHONE_DIGIT_COUNT}
                disabled={readOnly || isSubmitting}
                {...register("phone", phoneRegisterOptions)}
              />
            </FormField>
          </FormSection>

          <FormSection title="Address">
            <FormField
              htmlFor="addressLine1"
              label="Address line 1"
              error={errors.addressLine1?.message}
            >
              <Input
                id="addressLine1"
                disabled={readOnly || isSubmitting}
                placeholder={enterPlaceholder("address line 1")}
                {...register("addressLine1")}
              />
            </FormField>
            <FormField
              htmlFor="addressLine2"
              label="Address line 2"
              error={errors.addressLine2?.message}
            >
              <Input
                id="addressLine2"
                disabled={readOnly || isSubmitting}
                placeholder={enterPlaceholder("address line 2")}
                {...register("addressLine2")}
              />
            </FormField>
            <FormField htmlFor="city" label="City" error={errors.city?.message}>
              <Input
                id="city"
                disabled={readOnly || isSubmitting}
                placeholder={enterPlaceholder("city")}
                {...register("city")}
              />
            </FormField>
            <FormField htmlFor="state" label="State" error={errors.state?.message}>
              <Input
                id="state"
                disabled={readOnly || isSubmitting}
                placeholder={enterPlaceholder("state")}
                {...register("state")}
              />
            </FormField>
            <FormField htmlFor="postalCode" label="Postal code" error={errors.postalCode?.message}>
              <Input
                id="postalCode"
                disabled={readOnly || isSubmitting}
                placeholder={enterPlaceholder("postal code")}
                {...register("postalCode")}
              />
            </FormField>
            <FormField htmlFor="country" label="Country" error={errors.country?.message}>
              <Input
                id="country"
                disabled={readOnly || isSubmitting}
                placeholder={enterPlaceholder("country")}
                {...register("country")}
              />
            </FormField>
          </FormSection>
        </form>
      )}
    </FormDialog>
  );
}
