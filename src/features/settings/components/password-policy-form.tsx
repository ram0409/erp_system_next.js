"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LockIcon, ShieldAlertIcon, ShieldCheckIcon, ShieldIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormActions } from "@/components/forms/form-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PASSWORD_POLICY_CATALOG,
  getPasswordPolicyRules,
  passwordPolicyRequirementList,
  type PasswordPolicyId,
} from "@/constants/password-policy";
import { updatePasswordPolicyAction } from "@/features/settings/actions";
import { cn } from "@/lib/utils";
import type { PasswordPolicySettings } from "@/types/settings";
import {
  updatePasswordPolicySchema,
  type UpdatePasswordPolicyInput,
} from "@/validations/settings";

const POLICY_ICONS: Readonly<Record<PasswordPolicyId, typeof ShieldIcon>> = {
  basic: ShieldIcon,
  standard: ShieldCheckIcon,
  strong: LockIcon,
  strict: ShieldAlertIcon,
};

interface PasswordPolicyFormProps {
  readonly settings: PasswordPolicySettings;
  readonly canEdit: boolean;
}

export function PasswordPolicyForm({ settings, canEdit }: PasswordPolicyFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const formValues = useMemo(
    (): UpdatePasswordPolicyInput => ({ policy: settings.policy }),
    [settings.policy],
  );

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdatePasswordPolicyInput>({
    resolver: zodResolver(updatePasswordPolicySchema),
    values: formValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!canEdit) {
      return;
    }
    setFormError(null);

    const result = await updatePasswordPolicyAction(values);

    if (!result.success) {
      if (result.errors.length > 0) {
        for (const fieldError of result.errors) {
          if (fieldError.field && fieldError.field !== "root") {
            setError(fieldError.field as keyof UpdatePasswordPolicyInput, {
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
        <CardTitle>Password policy</CardTitle>
        <CardDescription>
          Choose one policy. New and reset passwords must match it. Existing
          passwords stay valid until they are changed.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5 sm:px-6">
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          {formError ? (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/8 text-destructive rounded-xl border px-3 py-2 text-sm"
            >
              {formError}
            </div>
          ) : null}

          <Controller
            name="policy"
            control={control}
            render={({ field }) => {
              const selectedRules = getPasswordPolicyRules(field.value);
              return (
                <div className="space-y-5">
                  <fieldset className="space-y-3">
                    <legend className="text-foreground text-sm font-medium">Policy</legend>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {PASSWORD_POLICY_CATALOG.map((option) => {
                        const pressed = field.value === option.id;
                        const Icon = POLICY_ICONS[option.id];
                        return (
                          <button
                            key={option.id}
                            type="button"
                            disabled={!canEdit || isSubmitting}
                            aria-pressed={pressed}
                            onClick={() => field.onChange(option.id)}
                            className={cn(
                              "focus-visible:ring-ring flex h-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition outline-none focus-visible:ring-2",
                              pressed
                                ? "border-primary bg-primary/8 ring-primary/20 ring-1"
                                : "border-border bg-surface hover:bg-accent",
                              (!canEdit || isSubmitting) && "cursor-not-allowed opacity-80",
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
                                pressed
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground",
                              )}
                              aria-hidden="true"
                            >
                              <Icon className="size-4" />
                            </span>
                            <span className="min-w-0">
                              <span className="text-foreground block text-sm font-medium">
                                {option.label}
                              </span>
                              <span className="text-foreground/80 mt-0.5 block text-xs font-medium">
                                {option.hint}
                              </span>
                              <span className="text-muted-foreground mt-1.5 block text-xs leading-relaxed">
                                {option.explanation}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {errors.policy?.message ? (
                      <p className="text-destructive text-sm" role="alert">
                        {errors.policy.message}
                      </p>
                    ) : null}
                  </fieldset>

                  <div className="border-border bg-surface-muted/60 rounded-lg border px-3.5 py-3">
                    <p className="text-foreground text-sm font-medium">
                      {selectedRules.label} — what users must enter
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                      {selectedRules.explanation}
                    </p>
                    <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-sm">
                      {passwordPolicyRequirementList(selectedRules).map((rule) => (
                        <li key={rule}>{rule}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            }}
          />

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
