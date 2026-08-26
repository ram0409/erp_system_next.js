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
import { TASK_STATUS, TASK_STATUS_OPTIONS } from "@/constants/status";
import { createTaskAction, updateTaskAction } from "@/features/tasks/actions";
import type { EmployeeOption } from "@/types/user";
import type { ProjectOption, TaskDetail } from "@/types/work";
import { formatFullName } from "@/utils/format";
import { createTaskSchema, type CreateTaskInput } from "@/validations/task";

const NONE = "none";

const EMPTY_VALUES: CreateTaskInput = {
  projectPublicId: "",
  title: "",
  description: "",
  assigneeUserPublicId: "",
  dueDate: "",
  status: TASK_STATUS.TODO,
};

function valuesFromDetail(detail: TaskDetail): CreateTaskInput {
  return {
    projectPublicId: detail.project.publicId,
    title: detail.title,
    description: detail.description ?? "",
    assigneeUserPublicId: detail.assignee?.publicId ?? "",
    dueDate: detail.dueDate ? detail.dueDate.slice(0, 10) : "",
    status: detail.status,
  };
}

function employeeLabel(employee: EmployeeOption): string {
  return `${employee.employeeCode} · ${formatFullName(employee.firstName, employee.lastName)}`;
}

export type TaskFormMode = "create" | "edit" | "view";

interface TaskFormDialogProps {
  open: boolean;
  mode: TaskFormMode;
  detail: TaskDetail | null;
  isLoading?: boolean;
  employees: readonly EmployeeOption[];
  projects: readonly ProjectOption[];
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function TaskFormDialog({
  open,
  mode,
  detail,
  isLoading = false,
  employees,
  projects,
  onOpenChange,
  onSuccess,
}: TaskFormDialogProps) {
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
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    values: formValues,
  });

  const title = mode === "create" ? "Add task" : mode === "edit" ? "Edit task" : "Task details";

  const onSubmit = handleSubmit(async (values) => {
    if (readOnly) return;
    setFormError(null);

    const result =
      mode === "edit" && detail
        ? await updateTaskAction({ ...values, publicId: detail.publicId })
        : await createTaskAction(values);

    if (!result.success) {
      for (const fieldError of result.errors) {
        if (fieldError.field && fieldError.field !== "root") {
          setError(fieldError.field as keyof CreateTaskInput, {
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
      description={mode === "create" ? "Create a task and assign it to a project." : undefined}
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
            form="task-form"
            isSubmitting={isSubmitting || isLoading}
            submitLabel={mode === "create" ? "Create task" : "Save changes"}
            onCancel={() => onOpenChange(false)}
            disableSubmit={mode === "edit" && !isDirty}
          />
        )
      }
    >
      {isLoading && mode !== "create" && !detail ? (
        <p className="text-muted-foreground text-sm">Loading task…</p>
      ) : (
        <form id="task-form" onSubmit={onSubmit} className="space-y-6" noValidate>
          {formError ? (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/8 text-destructive rounded-xl border px-3 py-2 text-sm"
            >
              {formError}
            </div>
          ) : null}
          <FormSection>
            <FormField htmlFor="title" label="Title" required error={errors.title?.message}>
              <Input
                id="title"
                autoComplete="off"
                placeholder="Enter the task title"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.title ? true : undefined}
                {...register("title")}
              />
            </FormField>
            <FormField
              htmlFor="projectPublicId"
              label="Project"
              required
              error={errors.projectPublicId?.message}
            >
              <Controller
                name="projectPublicId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                    disabled={readOnly || isSubmitting}
                  >
                    <SelectTrigger
                      id="projectPublicId"
                      aria-invalid={errors.projectPublicId ? true : undefined}
                    >
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.publicId} value={project.publicId}>
                          {project.code} · {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField
              htmlFor="assigneeUserPublicId"
              label="Assignee"
              error={errors.assigneeUserPublicId?.message}
            >
              <Controller
                name="assigneeUserPublicId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value && field.value.length > 0 ? field.value : NONE}
                    onValueChange={(value) => field.onChange(value === NONE ? "" : value)}
                    disabled={readOnly || isSubmitting}
                  >
                    <SelectTrigger
                      id="assigneeUserPublicId"
                      aria-invalid={errors.assigneeUserPublicId ? true : undefined}
                    >
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Unassigned</SelectItem>
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
                      {TASK_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField htmlFor="dueDate" label="Due date" error={errors.dueDate?.message}>
              <Input
                id="dueDate"
                type="date"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.dueDate ? true : undefined}
                {...register("dueDate")}
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
