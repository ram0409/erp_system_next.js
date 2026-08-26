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
import {
  createDesignationAction,
  updateDesignationAction,
} from "@/features/designations/actions";
import type { DesignationDetail } from "@/types/org-master";
import { createDesignationSchema, type CreateDesignationInput } from "@/validations/org-master";

const EMPTY_VALUES: CreateDesignationInput = { code: "", name: "", description: "" };

function valuesFromDetail(detail: DesignationDetail): CreateDesignationInput {
  return {
    code: detail.code,
    name: detail.name,
    description: detail.description ?? "",
  };
}

export type DesignationFormMode = "create" | "edit" | "view";

interface DesignationFormDialogProps {
  open: boolean;
  mode: DesignationFormMode;
  detail: DesignationDetail | null;
  isLoading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function DesignationFormDialog({
  open,
  mode,
  detail,
  isLoading = false,
  onOpenChange,
  onSuccess,
}: DesignationFormDialogProps) {
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
  } = useForm<CreateDesignationInput>({
    resolver: zodResolver(createDesignationSchema),
    values: formValues,
  });

  const title =
    mode === "create"
      ? "Add designation"
      : mode === "edit"
        ? "Edit designation"
        : "Designation details";

  const onSubmit = handleSubmit(async (values) => {
    if (readOnly) return;
    setFormError(null);
    const result =
      mode === "edit" && detail
        ? await updateDesignationAction({ ...values, publicId: detail.publicId })
        : await createDesignationAction(values);

    if (!result.success) {
      for (const fieldError of result.errors) {
        if (fieldError.field && fieldError.field !== "root") {
          setError(fieldError.field as keyof CreateDesignationInput, {
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

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setFormError(null);
        onOpenChange(next);
      }}
      title={title}
      description={
        mode === "create" ? "Add a job title that can be assigned to employees." : undefined
      }
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
            form="designation-form"
            isSubmitting={isSubmitting || isLoading}
            submitLabel={mode === "create" ? "Create designation" : "Save changes"}
            onCancel={() => onOpenChange(false)}
            disableSubmit={mode === "edit" && !isDirty}
          />
        )
      }
    >
      {isLoading && mode !== "create" && !detail ? (
        <p className="text-muted-foreground text-sm">Loading designation…</p>
      ) : (
        <form id="designation-form" onSubmit={onSubmit} className="space-y-6" noValidate>
          {formError ? (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/8 text-destructive rounded-xl border px-3 py-2 text-sm"
            >
              {formError}
            </div>
          ) : null}
          <FormSection>
            <FormField htmlFor="name" label="Name" required error={errors.name?.message}>
              <Input
                id="name"
                autoComplete="off"
                placeholder="Enter the designation name"
                disabled={readOnly || isSubmitting}
                {...register("name")}
              />
            </FormField>
            <FormField htmlFor="code" label="Code" required error={errors.code?.message}>
              <Input
                id="code"
                autoComplete="off"
                placeholder="Enter the designation code"
                disabled={readOnly || isSubmitting}
                {...register("code")}
              />
            </FormField>
            <FormField htmlFor="description" label="Description" error={errors.description?.message} fullWidth>
              <Textarea
                id="description"
                placeholder="Enter the description"
                disabled={readOnly || isSubmitting}
                {...register("description")}
              />
            </FormField>
          </FormSection>
        </form>
      )}
    </FormDialog>
  );
}
