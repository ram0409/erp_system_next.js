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
import { PROJECT_STATUS, PROJECT_STATUS_OPTIONS } from "@/constants/status";
import { createProjectAction, updateProjectAction } from "@/features/projects/actions";
import type { EmployeeOption } from "@/types/user";
import type { ProjectDetail } from "@/types/work";
import { formatFullName } from "@/utils/format";
import { createProjectSchema, type CreateProjectInput } from "@/validations/project";

const EMPTY_VALUES: CreateProjectInput = {
  code: "",
  name: "",
  description: "",
  ownerUserPublicId: "",
  startDate: "",
  endDate: "",
  status: PROJECT_STATUS.PLANNED,
};

function valuesFromDetail(detail: ProjectDetail): CreateProjectInput {
  return {
    code: detail.code,
    name: detail.name,
    description: detail.description ?? "",
    ownerUserPublicId: detail.owner.publicId,
    startDate: detail.startDate ? detail.startDate.slice(0, 10) : "",
    endDate: detail.endDate ? detail.endDate.slice(0, 10) : "",
    status: detail.status,
  };
}

function employeeLabel(employee: EmployeeOption): string {
  return `${employee.employeeCode} · ${formatFullName(employee.firstName, employee.lastName)}`;
}

export type ProjectFormMode = "create" | "edit" | "view";

interface ProjectFormDialogProps {
  open: boolean;
  mode: ProjectFormMode;
  detail: ProjectDetail | null;
  isLoading?: boolean;
  employees: readonly EmployeeOption[];
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function ProjectFormDialog({
  open,
  mode,
  detail,
  isLoading = false,
  employees,
  onOpenChange,
  onSuccess,
}: ProjectFormDialogProps) {
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
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    values: formValues,
  });

  const title =
    mode === "create" ? "Add project" : mode === "edit" ? "Edit project" : "Project details";

  const onSubmit = handleSubmit(async (values) => {
    if (readOnly) return;
    setFormError(null);

    const result =
      mode === "edit" && detail
        ? await updateProjectAction({ ...values, publicId: detail.publicId })
        : await createProjectAction(values);

    if (!result.success) {
      for (const fieldError of result.errors) {
        if (fieldError.field && fieldError.field !== "root") {
          setError(fieldError.field as keyof CreateProjectInput, {
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
      description={mode === "create" ? "Create a project and assign an owner." : undefined}
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
            form="project-form"
            isSubmitting={isSubmitting || isLoading}
            submitLabel={mode === "create" ? "Create project" : "Save changes"}
            onCancel={() => onOpenChange(false)}
            disableSubmit={mode === "edit" && !isDirty}
          />
        )
      }
    >
      {isLoading && mode !== "create" && !detail ? (
        <p className="text-muted-foreground text-sm">Loading project…</p>
      ) : (
        <form id="project-form" onSubmit={onSubmit} className="space-y-6" noValidate>
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
                placeholder="Enter the project name"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.name ? true : undefined}
                {...register("name")}
              />
            </FormField>
            <FormField htmlFor="code" label="Code" required error={errors.code?.message}>
              <Input
                id="code"
                autoComplete="off"
                placeholder="Enter the project code"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.code ? true : undefined}
                {...register("code")}
              />
            </FormField>
            <FormField
              htmlFor="ownerUserPublicId"
              label="Owner"
              required
              error={errors.ownerUserPublicId?.message}
            >
              <Controller
                name="ownerUserPublicId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                    disabled={readOnly || isSubmitting}
                  >
                    <SelectTrigger
                      id="ownerUserPublicId"
                      aria-invalid={errors.ownerUserPublicId ? true : undefined}
                    >
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.publicId} value={employee.publicId}>
                          {employeeLabel(employee)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField htmlFor="status" label="Status" required error={errors.status?.message}>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={readOnly || isSubmitting}
                  >
                    <SelectTrigger id="status" aria-invalid={errors.status ? true : undefined}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField htmlFor="startDate" label="Start date" error={errors.startDate?.message}>
              <Input
                id="startDate"
                type="date"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.startDate ? true : undefined}
                {...register("startDate")}
              />
            </FormField>
            <FormField htmlFor="endDate" label="End date" error={errors.endDate?.message}>
              <Input
                id="endDate"
                type="date"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.endDate ? true : undefined}
                {...register("endDate")}
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
