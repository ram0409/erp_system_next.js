"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ERROR_MESSAGES } from "@/constants/messages";
import {
  TWO_FACTOR_CODE_TTL_MINUTES,
  TWO_FACTOR_METHOD_LABELS,
  TWO_FACTOR_TIMER_GREEN_SECONDS,
  TWO_FACTOR_TIMER_ORANGE_SECONDS,
  TWO_FACTOR_TIMER_RED_SECONDS,
} from "@/constants/two-factor";
import { ROUTES } from "@/constants/routes";
import {
  resendLoginTwoFactorEmailAction,
  resendLoginTwoFactorSmsAction,
  switchLoginTwoFactorMethodAction,
  verifyLoginTwoFactorAction,
} from "@/features/two-factor/actions";
import type { LoginTwoFactorChallenge, TwoFactorMethodId } from "@/types/two-factor";
import { cn } from "@/lib/utils";
import {
  verifyLoginTwoFactorSchema,
  type VerifyLoginTwoFactorInput,
} from "@/validations/two-factor";

interface VerifyTwoFactorFormProps {
  readonly challenge: LoginTwoFactorChallenge;
}

function methodHint(challenge: LoginTwoFactorChallenge): string {
  if (challenge.method === "EMAIL") {
    return `Enter the 6-digit code sent to ${challenge.emailMasked}.`;
  }
  if (challenge.method === "SMS") {
    return `Enter the 6-digit code sent to ${challenge.phoneMasked ?? "your phone"}.`;
  }
  return `Enter the 6-digit code from ${TWO_FACTOR_METHOD_LABELS.AUTHENTICATOR}.`;
}

function switchLabel(from: TwoFactorMethodId, to: TwoFactorMethodId): string {
  if (to === "EMAIL") {
    return "Send code via Email";
  }
  if (to === "SMS") {
    return "Send code via SMS";
  }
  if (from === "EMAIL" || from === "SMS") {
    return "Use Microsoft Authenticator instead";
  }
  return `Use ${TWO_FACTOR_METHOD_LABELS[to]} instead`;
}

function secondsUntil(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1_000));
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function VerifyTwoFactorForm({ challenge: initialChallenge }: VerifyTwoFactorFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState(initialChallenge);
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(initialChallenge.expiresAt));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VerifyLoginTwoFactorInput>({
    resolver: zodResolver(verifyLoginTwoFactorSchema),
    defaultValues: { code: "" },
  });

  useEffect(() => {
    const isOtp = challenge.method === "EMAIL" || challenge.method === "SMS";
    let markedExpired = secondsUntil(challenge.expiresAt) === 0;

    setSecondsLeft(secondsUntil(challenge.expiresAt));

    if (!isOtp) {
      return;
    }

    if (markedExpired) {
      reset({ code: "" });
      setFormError(ERROR_MESSAGES.TWO_FACTOR_CODE_EXPIRED);
    }

    const timer = window.setInterval(() => {
      const remaining = secondsUntil(challenge.expiresAt);
      setSecondsLeft(remaining);

      if (remaining === 0 && !markedExpired) {
        markedExpired = true;
        reset({ code: "" });
        setFormError(ERROR_MESSAGES.TWO_FACTOR_CODE_EXPIRED);
      }
    }, 1_000);

    return () => window.clearInterval(timer);
  }, [challenge.expiresAt, challenge.method, reset]);

  const alternateMethods = challenge.availableMethods.filter(
    (method) => method !== challenge.method,
  );
  const otpAlternates = alternateMethods.filter(
    (method) => method === "EMAIL" || method === "SMS",
  );
  const otherAlternates = alternateMethods.filter(
    (method) => method !== "EMAIL" && method !== "SMS",
  );
  const isOtpMethod = challenge.method === "EMAIL" || challenge.method === "SMS";
  const codeExpired = isOtpMethod && secondsLeft === 0;
  const canResend = codeExpired;
  const timerProgress =
    (secondsLeft / (TWO_FACTOR_CODE_TTL_MINUTES * 60)) * 100;
  const timerTone =
    secondsLeft <= TWO_FACTOR_TIMER_RED_SECONDS
      ? "danger"
      : secondsLeft <= TWO_FACTOR_TIMER_ORANGE_SECONDS
        ? "caution"
        : secondsLeft <= TWO_FACTOR_TIMER_GREEN_SECONDS
          ? "warn"
          : "normal";

  const onSubmit = handleSubmit((values) => {
    if (codeExpired || secondsUntil(challenge.expiresAt) === 0) {
      setSecondsLeft(0);
      setFormError(ERROR_MESSAGES.TWO_FACTOR_CODE_EXPIRED);
      return;
    }

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

  const switchMethod = (method: TwoFactorMethodId) => {
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

      reset({ code: "" });
      setChallenge(result.data);
    });
  };

  const resendCode = () => {
    setFormError(null);
    startTransition(async () => {
      const result =
        challenge.method === "SMS"
          ? await resendLoginTwoFactorSmsAction({})
          : await resendLoginTwoFactorEmailAction({});

      if (!result.success) {
        setFormError(result.message);
        return;
      }

      reset({ code: "" });
      setFormError(null);
      setChallenge(result.data);
    });
  };

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

      <p className="text-muted-foreground text-sm leading-relaxed">{methodHint(challenge)}</p>

      <FormField htmlFor="code" label="Verification code" required error={errors.code?.message}>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          maxLength={6}
          className="auth-field tracking-[0.35em]"
          aria-invalid={errors.code ? true : undefined}
          disabled={isPending || codeExpired}
          autoFocus
          {...register("code")}
        />
      </FormField>

      <Button type="submit" className="auth-submit w-full" disabled={isPending || codeExpired}>
        {isPending ? <Spinner label="Verifying" /> : null}
        {isPending ? "Verifying..." : "Continue"}
      </Button>

      <div className="flex flex-col gap-2 text-center text-sm">
        {isOtpMethod ? (
          canResend ? (
            <button
              type="button"
              className="auth-otp-resend"
              onClick={resendCode}
              disabled={isPending}
            >
              {challenge.method === "SMS" ? "Resend SMS code" : "Resend email code"}
            </button>
          ) : (
            <div
              className={cn(
                "auth-otp-timer",
                timerTone === "warn" && "auth-otp-timer--warn",
                timerTone === "caution" && "auth-otp-timer--caution",
                timerTone === "danger" && "auth-otp-timer--danger",
              )}
              aria-live="polite"
            >
              <div className="auth-otp-timer-row">
                <span className="auth-otp-timer-label">Expires in</span>
                <span className="auth-otp-timer-digits">{formatCountdown(secondsLeft)}</span>
              </div>
              <div className="auth-otp-timer-track" aria-hidden="true">
                <div
                  className="auth-otp-timer-fill"
                  style={{ width: `${Math.max(0, Math.min(100, timerProgress))}%` }}
                />
              </div>
            </div>
          )
        ) : null}

        {otpAlternates.length > 0 ? (
          <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            {otpAlternates.map((method, index) => (
              <span key={method} className="inline-flex items-center gap-x-2">
                {index > 0 ? <span aria-hidden="true">/</span> : null}
                <button
                  type="button"
                  className="hover:text-foreground underline-offset-4 hover:underline"
                  onClick={() => switchMethod(method)}
                  disabled={isPending}
                >
                  {switchLabel(challenge.method, method)}
                </button>
              </span>
            ))}
          </div>
        ) : null}

        {otherAlternates.map((method) => (
          <button
            key={method}
            type="button"
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            onClick={() => switchMethod(method)}
            disabled={isPending}
          >
            {switchLabel(challenge.method, method)}
          </button>
        ))}

        <Link
          href={ROUTES.CANCEL_TWO_FACTOR}
          className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
