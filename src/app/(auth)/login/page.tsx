import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CALLBACK_URL_PARAM } from "@/constants/auth";
import { ROUTES } from "@/constants/routes";
import { AuthPageHeading } from "@/features/auth/components/auth-page-heading";
import { LoginForm } from "@/features/auth/components/login-form";
import { getActorContext } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export const dynamic = "force-dynamic";

/**
 * Only relative callback paths are honoured. Redirecting to an absolute URL from
 * a query parameter is an open redirect, which is a convincing way to send a user
 * to a copy of this login page on someone else's domain.
 */
function safeRedirect(value: string | undefined): string | undefined {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return undefined;
  }
  return value;
}

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
  const next = safeRedirect(Array.isArray(raw) ? raw[0] : raw);

  return (
    <div className="space-y-6">
      <AuthPageHeading title="Welcome Back" />
      <LoginForm redirectTo={next} />
    </div>
  );
}
