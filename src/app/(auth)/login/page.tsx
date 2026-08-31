import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CALLBACK_URL_PARAM } from "@/constants/auth";
import { ROUTES } from "@/constants/routes";
import { AuthPageHeading } from "@/features/auth/components/auth-page-heading";
import { LoginForm } from "@/features/auth/components/login-form";
import { isSafeRelativePath } from "@/lib/login-href";
import { getActorContext } from "@/lib/session";
import {
  clearTwoFactorPendingCookie,
  readTwoFactorPendingCookie,
} from "@/lib/two-factor-pending-cookie";
import * as twoFactorService from "@/services/two-factor-service";

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
  const cancelRaw = params.cancel;
  const cancel = (Array.isArray(cancelRaw) ? cancelRaw[0] : cancelRaw) === "1";

  if (cancel) {
    await clearTwoFactorPendingCookie();
  } else {
    const pendingChallengeId = await readTwoFactorPendingCookie();

    if (pendingChallengeId) {
      const pendingChallenge =
        await twoFactorService.getLoginChallengeSummary(pendingChallengeId);

      if (pendingChallenge) {
        redirect(ROUTES.VERIFY_TWO_FACTOR);
      }

      await clearTwoFactorPendingCookie();
    }
  }

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
