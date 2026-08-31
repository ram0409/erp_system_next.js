"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  getPasswordPolicyRules,
  passwordPolicyHint,
  type PasswordPolicyId,
} from "@/constants/password-policy";
import { changePasswordAction } from "@/features/auth/actions";
import { createChangePasswordSchema, type ChangePasswordInput } from "@/validations/auth";

interface ChangePasswordFormProps {
  /** True when the account was created with a generated password. */
  forced?: boolean;
  readonly policy: PasswordPolicyId;
}

export function ChangePasswordForm({ forced = false, policy }: ChangePasswordFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const schema = useMemo(() => createChangePasswordSchema(policy), [policy]);
  const hint = passwordPolicyHint(getPasswordPolicyRules(policy));

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await changePasswordAction(values);

      if (!result.success) {
        // Field-level errors from the server are attached to their inputs; the
        // rest surface as a banner.
        const fieldErrors = result.errors.filter(
          (error): error is { field: keyof ChangePasswordInput; message: string } =>
            error.field === "currentPassword" ||
            error.field === "newPassword" ||
            error.field === "confirmPassword",
        );

        for (const error of fieldErrors) {
          setError(error.field, { message: error.message });
        }

        if (fieldErrors.length === 0) {
          setFormError(result.message);
        }
        return;
      }

      reset();
      toast.success(result.message);
      router.refresh();
      router.replace(result.data.redirectTo);
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {forced ? (
        <div
          role="status"
          className="border-warning/30 bg-warning/8 text-foreground rounded-xl border px-3 py-2 text-sm"
        >
          Your account uses a temporary password. Choose a new one to continue.
        </div>
      ) : null}

      {formError ? (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/8 text-destructive rounded-xl border px-3 py-2 text-sm"
        >
          {formError}
        </div>
      ) : null}

      <FormField
        htmlFor="currentPassword"
        label="Current password"
        required
        error={errors.currentPassword?.message}
      >
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          placeholder="Enter the current password"
          aria-invalid={errors.currentPassword ? true : undefined}
          disabled={isPending}
          {...register("currentPassword")}
        />
      </FormField>

      <FormField
        htmlFor="newPassword"
        label="New password"
        required
        error={errors.newPassword?.message}
        hint={hint}
      >
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Enter the new password"
          aria-invalid={errors.newPassword ? true : undefined}
          disabled={isPending}
          {...register("newPassword")}
        />
      </FormField>

      <FormField
        htmlFor="confirmPassword"
        label="Confirm new password"
        required
        error={errors.confirmPassword?.message}
      >
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Confirm the new password"
          aria-invalid={errors.confirmPassword ? true : undefined}
          disabled={isPending}
          {...register("confirmPassword")}
        />
      </FormField>

      <p className="text-muted-foreground text-xs">
        Changing your password signs out your other sessions.
      </p>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <Spinner label="Saving" /> : null}
        {isPending ? "Saving..." : "Change password"}
      </Button>
    </form>
  );
}
