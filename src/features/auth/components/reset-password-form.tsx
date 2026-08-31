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
import { resetPasswordAction } from "@/features/auth/actions";
import { createResetPasswordSchema, type ResetPasswordInput } from "@/validations/auth";

interface ResetPasswordFormProps {
  token: string;
  readonly policy: PasswordPolicyId;
}

export function ResetPasswordForm({ token, policy }: ResetPasswordFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const schema = useMemo(() => createResetPasswordSchema(policy), [policy]);
  const hint = passwordPolicyHint(getPasswordPolicyRules(policy));

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(schema),
    defaultValues: { token, newPassword: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await resetPasswordAction(values);

      if (!result.success) {
        const fieldErrors = result.errors.filter(
          (error): error is { field: keyof ResetPasswordInput; message: string } =>
            error.field === "newPassword" ||
            error.field === "confirmPassword" ||
            error.field === "token",
        );

        for (const error of fieldErrors) {
          if (error.field === "token") {
            setFormError(error.message);
            continue;
          }
          setError(error.field, { message: error.message });
        }

        if (fieldErrors.length === 0) {
          setFormError(result.message);
        }
        return;
      }

      toast.success(result.message);
      router.replace(result.data.redirectTo);
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" {...register("token")} />

      {formError ? (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/8 text-destructive rounded-xl border px-3 py-2.5 text-sm"
        >
          {formError}
        </div>
      ) : null}

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
          className="auth-field"
          autoFocus
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
          className="auth-field"
          aria-invalid={errors.confirmPassword ? true : undefined}
          disabled={isPending}
          {...register("confirmPassword")}
        />
      </FormField>

      <Button type="submit" className="auth-submit w-full" disabled={isPending}>
        {isPending ? <Spinner label="Updating" /> : null}
        {isPending ? "Updating..." : "Update password"}
      </Button>
    </form>
  );
}
