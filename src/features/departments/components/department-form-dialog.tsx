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
import { Textarea } from "@/components/ui/textarea";
import {
  createDepartmentAction,
  updateDepartmentAction,
} from "@/features/departments/actions";
import type { DepartmentDetail } from "@/types/org-master";
import type { UserBranchOption } from "@/types/user";
import { createDepartmentSchema, type CreateDepartmentInput } from "@/validations/org-master";

const NONE = "none";

const EMPTY_VALUES: CreateDepartmentInput = {
  code: "",
  name: "",
  description: "",
  branchPublicId: "",
};

function valuesFromDetail(detail: DepartmentDetail): CreateDepartmentInput {
  return {
    code: detail.code,
    name: detail.name,
    description: detail.description ?? "",
    branchPublicId: detail.branch?.publicId ?? "",
  };
}

export type DepartmentFormMode = "create" | "edit" | "view";

interface DepartmentFormDialogProps {
  open: boolean;
  mode: DepartmentFormMode;
  detail: DepartmentDetail | null;
  isLoading?: boolean;
  branches: readonly UserBranchOption[];
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function DepartmentFormDialog({
  open,
  mode,
  detail,
  isLoading = false,
  branches,
  onOpenChange,
  onSuccess,
}: DepartmentFormDialogProps) {
  const readOnly = mode === "view";
  const [formError, setFormError] = useState<string | null>(null);
  const formValues = useMemo(
    () => (mode === "create" || !detail ? EMPTY_VALUES : valuesFromDetail(detail)),
    [mode, detail],
  );

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CreateDepartmentInput>({
    resolver: zodResolver(createDepartmentSchema),
    values: formValues,
  });

  const title =
    mode === "create" ? "Add department" : mode === "edit" ? "Edit department" : "Department details";

  const onSubmit = handleSubmit(async (values) => {
    if (readOnly) return;
    setFormError(null);

    const result =
      mode === "edit" && detail
        ? await updateDepartmentAction({ ...values, publicId: detail.publicId })
        : await createDepartmentAction(values);

    if (!result.success) {
      for (const fieldError of result.errors) {
        if (fieldError.field && fieldError.field !== "root") {
          setError(fieldError.field as keyof CreateDepartmentInput, {
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
        mode === "create"
          ? "Add a department. Employees can be assigned to it from Users and Employees."
          : undefined
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
            form="department-form"
            isSubmitting={isSubmitting || isLoading}
            submitLabel={mode === "create" ? "Create department" : "Save changes"}
            onCancel={() => onOpenChange(false)}
            disableSubmit={mode === "edit" && !isDirty}
          />
        )
      }
    >
      {isLoading && mode !== "create" && !detail ? (
        <p className="text-muted-foreground text-sm">Loading department…</p>
      ) : (
        <form id="department-form" onSubmit={onSubmit} className="space-y-6" noValidate>
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
                placeholder="Enter the department name"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.name ? true : undefined}
                {...register("name")}
              />
            </FormField>
            <FormField htmlFor="code" label="Code" required error={errors.code?.message}>
              <Input
                id="code"
                autoComplete="off"
                placeholder="Enter the department code"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.code ? true : undefined}
                {...register("code")}
              />
            </FormField>
            <FormField htmlFor="branchPublicId" label="Branch" error={errors.branchPublicId?.message}>
              <Controller
                name="branchPublicId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value && field.value.length > 0 ? field.value : NONE}
                    onValueChange={(value) => field.onChange(value === NONE ? "" : value)}
                    disabled={readOnly || isSubmitting}
                  >
                    <SelectTrigger id="branchPublicId" aria-invalid={errors.branchPublicId ? true : undefined}>
                      <SelectValue placeholder="All branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>All branches</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.publicId} value={branch.publicId}>
                          {branch.code} · {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField
              htmlFor="description"
              label="Description"
              error={errors.description?.message}
              fullWidth
            >
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
