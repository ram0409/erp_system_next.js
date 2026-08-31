"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  INACTIVITY_DEACTIVATE_DAY_OPTIONS,
  INACTIVITY_POLICY_OFF,
  inactivityPolicyFormValue,
  type InactivityPolicyFormValue,
} from "@/constants/security";
import { updateSecurityPolicyAction } from "@/features/settings/actions";
import type { SecurityPolicy } from "@/types/settings";
import {
  updateSecurityPolicyFormSchema,
  type UpdateSecurityPolicyFormValues,
} from "@/validations/settings";

const POLICY_OPTIONS: readonly { value: InactivityPolicyFormValue; label: string }[] = [
  { value: INACTIVITY_POLICY_OFF, label: "Off" },
  ...INACTIVITY_DEACTIVATE_DAY_OPTIONS.map((option) => ({
    value: String(option.value) as InactivityPolicyFormValue,
    label: option.label,
  })),
];

interface InactivityPolicyFormProps {
  readonly policy: SecurityPolicy;
  readonly canEdit: boolean;
}

export function InactivityPolicyForm({ policy, canEdit }: InactivityPolicyFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const formValues = useMemo(
    (): UpdateSecurityPolicyFormValues => ({
      inactivityDeactivateAfterDays: inactivityPolicyFormValue(
        policy.inactivityDeactivateAfterDays,
      ),
    }),
    [policy.inactivityDeactivateAfterDays],
  );

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateSecurityPolicyFormValues>({
    resolver: zodResolver(updateSecurityPolicyFormSchema),
    values: formValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!canEdit) {
      return;
    }
    setFormError(null);

    const result = await updateSecurityPolicyAction(values);

    if (!result.success) {
      if (result.errors.length > 0) {
        for (const fieldError of result.errors) {
          if (fieldError.field && fieldError.field !== "root") {
            setError(fieldError.field as keyof UpdateSecurityPolicyFormValues, {
              type: "server",
              message: fieldError.message,
            });
          }
        }
      }
      setFormError(result.message);
      return;
    }

    toast.success(result.message);
    router.refresh();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inactive accounts</CardTitle>
        <CardDescription>
          Deactivate users who have not signed in for the selected period and email
          them. Super Admin accounts are never auto-deactivated.
        </CardDescription>
      </CardHeader>
      <CardContent className="max-w-md px-5 pb-5 sm:px-6">
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          {formError ? (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/8 text-destructive rounded-xl border px-3 py-2 text-sm"
            >
              {formError}
            </div>
          ) : null}

          <FormField
            htmlFor="inactivityDeactivateAfterDays"
            label="Deactivate after"
            required
            error={errors.inactivityDeactivateAfterDays?.message}
            hint="Off keeps accounts active until an administrator deactivates them."
          >
            <Controller
              name="inactivityDeactivateAfterDays"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!canEdit || isSubmitting}
                >
                  <SelectTrigger
                    id="inactivityDeactivateAfterDays"
                    aria-invalid={errors.inactivityDeactivateAfterDays ? true : undefined}
                    aria-describedby={
                      errors.inactivityDeactivateAfterDays
                        ? "inactivityDeactivateAfterDays-error"
                        : "inactivityDeactivateAfterDays-hint"
                    }
                  >
                    <SelectValue placeholder="Choose a period" />
                  </SelectTrigger>
                  <SelectContent>
                    {POLICY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          {canEdit ? (
            <FormActions
              isSubmitting={isSubmitting}
              submitLabel="Save policy"
              disableSubmit={!isDirty}
            />
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
