"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ROUTES } from "@/constants/routes";
import { signInAction } from "@/features/auth/actions";
import { signInSchema, type SignInInput } from "@/validations/auth";

interface LoginFormProps {
  /** Where to land after signing in, supplied by the login page from `?next=`. */
  redirectTo?: string | undefined;
}

/**
 * The client half of sign-in. Validates with the same schema the server action
 * uses, so the rules cannot drift; the server still re-validates, because a
 * browser can post anything.
 *
 * A failure is rendered as a single banner rather than per-field errors on email
 * and password, since "which of the two was wrong" is exactly what must not be
 * disclosed.
 */
export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await signInAction(values);

      if (!result.success) {
        setFormError(result.message);
        return;
      }

      // `router.refresh()` first, so the layout re-renders with the new session
      // cookie before the dashboard route is requested.
      router.refresh();
      router.replace(redirectTo ?? result.data.redirectTo);
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

      <FormField htmlFor="email" label="Email or username" required error={errors.email?.message}>
        <Input
          id="email"
          type="text"
          autoComplete="username"
          placeholder="Enter the email or username"
          autoFocus
          className="auth-field"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "email-error" : undefined}
          disabled={isPending}
          {...register("email")}
        />
      </FormField>

      <FormField htmlFor="password" label="Password" required error={errors.password?.message}>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter the password"
            className="auth-field pr-11"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "password-error" : undefined}
            disabled={isPending}
            {...register("password")}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-0.5 size-9 -translate-y-1/2"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            disabled={isPending}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
        </div>
      </FormField>

      <Button type="submit" className="auth-submit w-full" disabled={isPending}>
        {isPending ? <Spinner label="Signing in" /> : null}
        {isPending ? "Signing in..." : "Log In"}
      </Button>

      <p className="text-center">
        <Link
          href={ROUTES.FORGOT_PASSWORD}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-sm text-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}
