import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CALLBACK_URL_PARAM } from "@/constants/auth";
import { ROUTES } from "@/constants/routes";
import { AuthPageHeading } from "@/features/auth/components/auth-page-heading";
import { LoginForm } from "@/features/auth/components/login-form";
import { isSafeRelativePath } from "@/lib/login-href";
import { getActorContext } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // An already-signed-in visitor has no reason to see this page.
  if (await getActorContext()) {
    redirect(ROUTES.DASHBOARD);
  }

  const params = await searchParams;
  const raw = params[CALLBACK_URL_PARAM];
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  const next = isSafeRelativePath(candidate) ? candidate : undefined;

  return (
    <div className="space-y-6">
      <AuthPageHeading title="Welcome Back" />
      <LoginForm redirectTo={next} />
    </div>
  );
}
