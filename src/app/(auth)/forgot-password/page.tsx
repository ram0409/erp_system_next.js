import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { AuthPageHeading } from "@/features/auth/components/auth-page-heading";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { getActorContext } from "@/lib/session";

export const metadata: Metadata = { title: "Forgot password" };

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  if (await getActorContext()) {
    redirect(ROUTES.DASHBOARD);
  }

  return (
    <div className="space-y-6">
      <AuthPageHeading
        title="Reset your password"
        description="Enter the email address for your staff account."
      />
      <ForgotPasswordForm />
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
