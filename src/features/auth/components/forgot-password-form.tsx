"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { forgotPasswordAction } from "@/features/auth/actions";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/validations/auth";

/**
 * Requests a reset mail. Success copy is the same whether the address is
 * registered, so this form never branches on the server result beyond errors
 * that apply to every caller (validation, rate limit).
 */
export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    setFormSuccess(null);

    startTransition(async () => {
      const result = await forgotPasswordAction(values);

      if (!result.success) {
        setFormError(result.message);
        return;
      }

      setFormSuccess(result.message);
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError ? (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/8 text-destructive rounded-xl border px-3 py-2.5 text-sm"
        >
          {formError}
        </div>
      ) : null}

      {formSuccess ? (
        <div
          role="status"
          className="border-success/30 bg-success/8 text-foreground rounded-xl border px-3 py-2.5 text-sm"
        >
          {formSuccess}
        </div>
      ) : null}

      <FormField
        htmlFor="email"
        label="Email address"
        required
        hint="The response is identical whether or not an account exists."
        error={errors.email?.message}
      >
        <Input
          id="email"
          type="email"
          autoComplete="username"
          placeholder="Enter the email address"
          className="auth-field"
          autoFocus
          aria-invalid={errors.email ? true : undefined}
          disabled={isPending}
          {...register("email")}
        />
      </FormField>

      <Button type="submit" className="auth-submit w-full" disabled={isPending}>
        {isPending ? <Spinner label="Sending" /> : null}
        {isPending ? "Sending..." : "Send reset link"}
      </Button>
    </form>
  );
}
