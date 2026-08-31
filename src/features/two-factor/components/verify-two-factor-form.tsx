"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { TWO_FACTOR_METHOD_LABELS } from "@/constants/two-factor";
import { ROUTES } from "@/constants/routes";
import {
  resendLoginTwoFactorEmailAction,
  switchLoginTwoFactorMethodAction,
  verifyLoginTwoFactorAction,
} from "@/features/two-factor/actions";
import type { LoginTwoFactorChallenge } from "@/types/two-factor";
import {
  verifyLoginTwoFactorSchema,
  type VerifyLoginTwoFactorInput,
} from "@/validations/two-factor";

interface VerifyTwoFactorFormProps {
  readonly challenge: LoginTwoFactorChallenge;
}

export function VerifyTwoFactorForm({ challenge: initialChallenge }: VerifyTwoFactorFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState(initialChallenge);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyLoginTwoFactorInput>({
    resolver: zodResolver(verifyLoginTwoFactorSchema),
    defaultValues: { code: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await verifyLoginTwoFactorAction(values);

      if (!result.success) {
        setFormError(result.message);
        return;
      }

      router.refresh();
      router.replace(result.data.redirectTo);
    });
  });

  const switchMethod = (method: "EMAIL" | "AUTHENTICATOR") => {
    if (method === challenge.method) {
      return;
    }

    setFormError(null);
    startTransition(async () => {
      const result = await switchLoginTwoFactorMethodAction({ method });

      if (!result.success) {
        setFormError(result.message);
        return;
      }

      setChallenge(result.data);
    });
  };

  const resendEmail = () => {
    setFormError(null);
    startTransition(async () => {
      const result = await resendLoginTwoFactorEmailAction({});

      if (!result.success) {
        setFormError(result.message);
        return;
      }

      setChallenge(result.data);
    });
  };

  const canSwitch =
    challenge.availableMethods.includes("EMAIL") &&
    challenge.availableMethods.includes("AUTHENTICATOR");

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

      <p className="text-muted-foreground text-sm leading-relaxed">
        {challenge.method === "EMAIL" ? (
          <>
            Enter the 6-digit code sent to <span className="text-foreground">{challenge.emailMasked}</span>.
          </>
        ) : (
          <>Enter the 6-digit code from {TWO_FACTOR_METHOD_LABELS.AUTHENTICATOR}.</>
        )}
      </p>

      <FormField htmlFor="code" label="Verification code" required error={errors.code?.message}>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          maxLength={6}
          className="auth-field tracking-[0.35em]"
          aria-invalid={errors.code ? true : undefined}
          disabled={isPending}
          autoFocus
          {...register("code")}
        />
      </FormField>

      <Button type="submit" className="auth-submit w-full" disabled={isPending}>
        {isPending ? <Spinner label="Verifying" /> : null}
        {isPending ? "Verifying..." : "Continue"}
      </Button>

      <div className="flex flex-col gap-2 text-center text-sm">
        {challenge.method === "EMAIL" ? (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            onClick={resendEmail}
            disabled={isPending}
          >
            Resend email code
          </button>
        ) : null}

        {canSwitch ? (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            onClick={() =>
              switchMethod(challenge.method === "EMAIL" ? "AUTHENTICATOR" : "EMAIL")
            }
            disabled={isPending}
          >
            {challenge.method === "EMAIL"
              ? "Use Microsoft Authenticator instead"
              : "Email me a code instead"}
          </button>
        ) : null}

        <Link
          href={`${ROUTES.LOGIN}?cancel=1`}
          className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
