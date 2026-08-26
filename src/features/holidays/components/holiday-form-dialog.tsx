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
import { HOLIDAY_TYPES, HOLIDAY_TYPE_OPTIONS } from "@/constants/status";
import { createHolidayAction, updateHolidayAction } from "@/features/holidays/actions";
import type { HolidayDetail } from "@/types/hr";
import { createHolidaySchema, type CreateHolidayInput } from "@/validations/holiday";

const EMPTY_VALUES: CreateHolidayInput = {
  holidayDate: "",
  name: "",
  type: HOLIDAY_TYPES.COMPANY,
  notes: "",
};

function valuesFromDetail(detail: HolidayDetail): CreateHolidayInput {
  return {
    holidayDate: detail.holidayDate.slice(0, 10),
    name: detail.name,
    type: detail.type,
    notes: detail.notes ?? "",
  };
}

export type HolidayFormMode = "create" | "edit" | "view";

interface HolidayFormDialogProps {
  open: boolean;
  mode: HolidayFormMode;
  detail: HolidayDetail | null;
  isLoading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function HolidayFormDialog({
  open,
  mode,
  detail,
  isLoading = false,
  onOpenChange,
  onSuccess,
}: HolidayFormDialogProps) {
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
  } = useForm<CreateHolidayInput>({
    resolver: zodResolver(createHolidaySchema),
    values: formValues,
  });

  const title =
    mode === "create" ? "Add holiday" : mode === "edit" ? "Edit holiday" : "Holiday details";

  const onSubmit = handleSubmit(async (values) => {
    if (readOnly) return;
    setFormError(null);

    const result =
      mode === "edit" && detail
        ? await updateHolidayAction({ ...values, publicId: detail.publicId })
        : await createHolidayAction(values);

    if (!result.success) {
      for (const fieldError of result.errors) {
        if (fieldError.field && fieldError.field !== "root") {
          setError(fieldError.field as keyof CreateHolidayInput, {
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
      description={mode === "create" ? "Add a day to the organisation holiday calendar." : undefined}
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
            form="holiday-form"
            isSubmitting={isSubmitting || isLoading}
            submitLabel={mode === "create" ? "Create holiday" : "Save changes"}
            onCancel={() => onOpenChange(false)}
            disableSubmit={mode === "edit" && !isDirty}
          />
        )
      }
    >
      {isLoading && mode !== "create" && !detail ? (
        <p className="text-muted-foreground text-sm">Loading holiday…</p>
      ) : (
        <form id="holiday-form" onSubmit={onSubmit} className="space-y-6" noValidate>
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
              htmlFor="holidayDate"
              label="Date"
              required
              error={errors.holidayDate?.message}
            >
              <Input
                id="holidayDate"
                type="date"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.holidayDate ? true : undefined}
                {...register("holidayDate")}
              />
            </FormField>
            <FormField htmlFor="name" label="Name" required error={errors.name?.message}>
              <Input
                id="name"
                autoComplete="off"
                placeholder="Enter the holiday name"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.name ? true : undefined}
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
                    <SelectTrigger id="type" aria-invalid={errors.type ? true : undefined}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {HOLIDAY_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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
