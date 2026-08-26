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
import { ATTENDANCE_DAY_STATUS, ATTENDANCE_DAY_STATUS_OPTIONS } from "@/constants/status";
import {
  createAttendanceAction,
  updateAttendanceAction,
} from "@/features/attendance/actions";
import type { AttendanceDetail } from "@/types/hr";
import type { EmployeeOption } from "@/types/user";
import { formatFullName } from "@/utils/format";
import { createAttendanceSchema, type CreateAttendanceInput } from "@/validations/attendance";

const EMPTY_VALUES: CreateAttendanceInput = {
  userPublicId: "",
  workDate: "",
  status: ATTENDANCE_DAY_STATUS.PRESENT,
  checkIn: "",
  checkOut: "",
  notes: "",
};

function valuesFromDetail(detail: AttendanceDetail): CreateAttendanceInput {
  return {
    userPublicId: detail.user.publicId,
    workDate: detail.workDate.slice(0, 10),
    status: detail.status,
    checkIn: detail.checkIn ?? "",
    checkOut: detail.checkOut ?? "",
    notes: detail.notes ?? "",
  };
}

function employeeLabel(employee: EmployeeOption): string {
  return `${employee.employeeCode} · ${formatFullName(employee.firstName, employee.lastName)}`;
}

export type AttendanceFormMode = "create" | "edit" | "view";

interface AttendanceFormDialogProps {
  open: boolean;
  mode: AttendanceFormMode;
  detail: AttendanceDetail | null;
  isLoading?: boolean;
  employees: readonly EmployeeOption[];
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function AttendanceFormDialog({
  open,
  mode,
  detail,
  isLoading = false,
  employees,
  onOpenChange,
  onSuccess,
}: AttendanceFormDialogProps) {
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
  } = useForm<CreateAttendanceInput>({
    resolver: zodResolver(createAttendanceSchema),
    values: formValues,
  });

  const title =
    mode === "create" ? "Add attendance" : mode === "edit" ? "Edit attendance" : "Attendance details";

  const onSubmit = handleSubmit(async (values) => {
    if (readOnly) return;
    setFormError(null);

    const result =
      mode === "edit" && detail
        ? await updateAttendanceAction({ ...values, publicId: detail.publicId })
        : await createAttendanceAction(values);

    if (!result.success) {
      for (const fieldError of result.errors) {
        if (fieldError.field && fieldError.field !== "root") {
          setError(fieldError.field as keyof CreateAttendanceInput, {
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
      description={mode === "create" ? "Record an attendance day for an employee." : undefined}
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
            form="attendance-form"
            isSubmitting={isSubmitting || isLoading}
            submitLabel={mode === "create" ? "Create attendance" : "Save changes"}
            onCancel={() => onOpenChange(false)}
            disableSubmit={mode === "edit" && !isDirty}
          />
        )
      }
    >
      {isLoading && mode !== "create" && !detail ? (
        <p className="text-muted-foreground text-sm">Loading attendance…</p>
      ) : (
        <form id="attendance-form" onSubmit={onSubmit} className="space-y-6" noValidate>
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
            <FormField htmlFor="workDate" label="Work date" required error={errors.workDate?.message}>
              <Input
                id="workDate"
                type="date"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.workDate ? true : undefined}
                {...register("workDate")}
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
                      {ATTENDANCE_DAY_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField htmlFor="checkIn" label="Check in" error={errors.checkIn?.message}>
              <Input
                id="checkIn"
                type="time"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.checkIn ? true : undefined}
                {...register("checkIn")}
              />
            </FormField>
            <FormField htmlFor="checkOut" label="Check out" error={errors.checkOut?.message}>
              <Input
                id="checkOut"
                type="time"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.checkOut ? true : undefined}
                {...register("checkOut")}
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
