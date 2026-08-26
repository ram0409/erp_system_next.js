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
import { createWorklogAction, updateWorklogAction } from "@/features/worklogs/actions";
import type { EmployeeOption } from "@/types/user";
import type { TaskOption, WorklogDetail } from "@/types/work";
import { formatFullName } from "@/utils/format";
import { createWorklogSchema, type CreateWorklogInput } from "@/validations/worklog";

const EMPTY_VALUES: CreateWorklogInput = {
  taskPublicId: "",
  userPublicId: "",
  workDate: "",
  hours: 8,
  notes: "",
};

function valuesFromDetail(detail: WorklogDetail): CreateWorklogInput {
  return {
    taskPublicId: detail.task.publicId,
    userPublicId: detail.user.publicId,
    workDate: detail.workDate.slice(0, 10),
    hours: detail.hours,
    notes: detail.notes ?? "",
  };
}

function employeeLabel(employee: EmployeeOption): string {
  return `${employee.employeeCode} · ${formatFullName(employee.firstName, employee.lastName)}`;
}

export type WorklogFormMode = "create" | "edit" | "view";

interface WorklogFormDialogProps {
  open: boolean;
  mode: WorklogFormMode;
  detail: WorklogDetail | null;
  isLoading?: boolean;
  employees: readonly EmployeeOption[];
  tasks: readonly TaskOption[];
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function WorklogFormDialog({
  open,
  mode,
  detail,
  isLoading = false,
  employees,
  tasks,
  onOpenChange,
  onSuccess,
}: WorklogFormDialogProps) {
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
  } = useForm<CreateWorklogInput>({
    resolver: zodResolver(createWorklogSchema),
    values: formValues,
  });

  const title =
    mode === "create" ? "Add worklog" : mode === "edit" ? "Edit worklog" : "Worklog details";

  const onSubmit = handleSubmit(async (values) => {
    if (readOnly) return;
    setFormError(null);

    const result =
      mode === "edit" && detail
        ? await updateWorklogAction({ ...values, publicId: detail.publicId })
        : await createWorklogAction(values);

    if (!result.success) {
      for (const fieldError of result.errors) {
        if (fieldError.field && fieldError.field !== "root") {
          setError(fieldError.field as keyof CreateWorklogInput, {
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
      description={mode === "create" ? "Log time spent on a task." : undefined}
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
            form="worklog-form"
            isSubmitting={isSubmitting || isLoading}
            submitLabel={mode === "create" ? "Create worklog" : "Save changes"}
            onCancel={() => onOpenChange(false)}
            disableSubmit={mode === "edit" && !isDirty}
          />
        )
      }
    >
      {isLoading && mode !== "create" && !detail ? (
        <p className="text-muted-foreground text-sm">Loading worklog…</p>
      ) : (
        <form id="worklog-form" onSubmit={onSubmit} className="space-y-6" noValidate>
          {formError ? (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/8 text-destructive rounded-xl border px-3 py-2 text-sm"
            >
              {formError}
            </div>
          ) : null}
          <FormSection>
            <FormField
              htmlFor="taskPublicId"
              label="Task"
              required
              error={errors.taskPublicId?.message}
            >
              <Controller
                name="taskPublicId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                    disabled={readOnly || isSubmitting}
                  >
                    <SelectTrigger
                      id="taskPublicId"
                      aria-invalid={errors.taskPublicId ? true : undefined}
                    >
                      <SelectValue placeholder="Select task" />
                    </SelectTrigger>
                    <SelectContent>
                      {tasks.map((task) => (
                        <SelectItem key={task.publicId} value={task.publicId}>
                          {task.project.code} · {task.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField
              htmlFor="userPublicId"
              label="Employee"
              required
              error={errors.userPublicId?.message}
            >
              <Controller
                name="userPublicId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                    disabled={readOnly || isSubmitting}
                  >
                    <SelectTrigger
                      id="userPublicId"
                      aria-invalid={errors.userPublicId ? true : undefined}
                    >
                      <SelectValue placeholder="Select employee" />
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
            <FormField htmlFor="workDate" label="Work date" required error={errors.workDate?.message}>
              <Input
                id="workDate"
                type="date"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.workDate ? true : undefined}
                {...register("workDate")}
              />
            </FormField>
            <FormField htmlFor="hours" label="Hours" required error={errors.hours?.message}>
              <Input
                id="hours"
                type="number"
                min={0.25}
                max={24}
                step={0.25}
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.hours ? true : undefined}
                {...register("hours", { valueAsNumber: true })}
              />
            </FormField>
            <FormField htmlFor="notes" label="Notes" error={errors.notes?.message} fullWidth>
              <Textarea
                id="notes"
                placeholder="Enter notes"
                disabled={readOnly || isSubmitting}
                {...register("notes")}
              />
            </FormField>
          </FormSection>
        </form>
      )}
    </FormDialog>
  );
}
