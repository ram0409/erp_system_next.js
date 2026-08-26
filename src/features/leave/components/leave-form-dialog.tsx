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
  LEAVE_STATUS,
  LEAVE_STATUS_OPTIONS,
  LEAVE_TYPES,
  LEAVE_TYPE_OPTIONS,
} from "@/constants/status";
import { createLeaveAction, updateLeaveAction } from "@/features/leave/actions";
import type { LeaveDetail } from "@/types/hr";
import type { EmployeeOption } from "@/types/user";
import { formatFullName } from "@/utils/format";
import { createLeaveSchema, type CreateLeaveInput } from "@/validations/leave";

const EMPTY_VALUES: CreateLeaveInput = {
  userPublicId: "",
  type: LEAVE_TYPES.CASUAL,
  startDate: "",
  endDate: "",
  reason: "",
  status: LEAVE_STATUS.PENDING,
};

function valuesFromDetail(detail: LeaveDetail): CreateLeaveInput {
  return {
    userPublicId: detail.user.publicId,
    type: detail.type,
    startDate: detail.startDate.slice(0, 10),
    endDate: detail.endDate.slice(0, 10),
    reason: detail.reason ?? "",
    status: detail.status,
  };
}

function employeeLabel(employee: EmployeeOption): string {
  return `${employee.employeeCode} · ${formatFullName(employee.firstName, employee.lastName)}`;
}

export type LeaveFormMode = "create" | "edit" | "view";

interface LeaveFormDialogProps {
  open: boolean;
  mode: LeaveFormMode;
  detail: LeaveDetail | null;
  isLoading?: boolean;
  employees: readonly EmployeeOption[];
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function LeaveFormDialog({
  open,
  mode,
  detail,
  isLoading = false,
  employees,
  onOpenChange,
  onSuccess,
}: LeaveFormDialogProps) {
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
  } = useForm<CreateLeaveInput>({
    resolver: zodResolver(createLeaveSchema),
    values: formValues,
  });

  const title =
    mode === "create" ? "Add leave request" : mode === "edit" ? "Edit leave request" : "Leave details";

  const onSubmit = handleSubmit(async (values) => {
    if (readOnly) return;
    setFormError(null);

    const result =
      mode === "edit" && detail
        ? await updateLeaveAction({ ...values, publicId: detail.publicId })
        : await createLeaveAction(values);

    if (!result.success) {
      for (const fieldError of result.errors) {
        if (fieldError.field && fieldError.field !== "root") {
          setError(fieldError.field as keyof CreateLeaveInput, {
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
      description={mode === "create" ? "Submit a leave request for an employee." : undefined}
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
            form="leave-form"
            isSubmitting={isSubmitting || isLoading}
            submitLabel={mode === "create" ? "Create leave request" : "Save changes"}
            onCancel={() => onOpenChange(false)}
            disableSubmit={mode === "edit" && !isDirty}
          />
        )
      }
    >
      {isLoading && mode !== "create" && !detail ? (
        <p className="text-muted-foreground text-sm">Loading leave request…</p>
      ) : (
        <form id="leave-form" onSubmit={onSubmit} className="space-y-6" noValidate>
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
                    <SelectTrigger id="type" aria-invalid={errors.type ? true : undefined}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAVE_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField htmlFor="startDate" label="Start date" required error={errors.startDate?.message}>
              <Input
                id="startDate"
                type="date"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.startDate ? true : undefined}
                {...register("startDate")}
              />
            </FormField>
            <FormField htmlFor="endDate" label="End date" required error={errors.endDate?.message}>
              <Input
                id="endDate"
                type="date"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.endDate ? true : undefined}
                {...register("endDate")}
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
                      {LEAVE_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField htmlFor="reason" label="Reason" error={errors.reason?.message} fullWidth>
              <Textarea
                id="reason"
                placeholder="Enter the reason"
                disabled={readOnly || isSubmitting}
                {...register("reason")}
              />
            </FormField>
          </FormSection>
        </form>
      )}
    </FormDialog>
  );
}
