import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ERROR_MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import { AuthPageHeading } from "@/features/auth/components/auth-page-heading";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { getActorContext } from "@/lib/session";

export const metadata: Metadata = { title: "Set a new password" };

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await getActorContext()) {
    redirect(ROUTES.DASHBOARD);
  }

  const params = await searchParams;
  const raw = params.token;
  const token = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";

  return (
    <div className="space-y-6">
      <AuthPageHeading
        title="Set a new password"
        description="Choose a password you have not used before."
      />
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/8 text-destructive rounded-xl border px-3 py-2.5 text-sm"
        >
          {ERROR_MESSAGES.PASSWORD_RESET_INVALID}
        </div>
      )}
      <p className="text-center">
        <Link
          href={ROUTES.LOGIN}
          className="text-primary focus-visible:ring-ring rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
