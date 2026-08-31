import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthPageHeading } from "@/features/auth/components/auth-page-heading";
import { VerifyTwoFactorForm } from "@/features/two-factor/components/verify-two-factor-form";
import { ROUTES } from "@/constants/routes";
import { readTwoFactorPendingCookie } from "@/lib/two-factor-pending-cookie";
import { getActorContext } from "@/lib/session";
import * as twoFactorService from "@/services/two-factor-service";

export const metadata: Metadata = { title: "Verify sign-in" };

export const dynamic = "force-dynamic";

export default async function VerifyTwoFactorPage() {
  if (await getActorContext()) {
    redirect(ROUTES.DASHBOARD);
  }

  const challengePublicId = await readTwoFactorPendingCookie();

  if (!challengePublicId) {
    redirect(ROUTES.LOGIN);
  }

  const challenge = await twoFactorService.getLoginChallengeSummary(challengePublicId);

  if (!challenge) {
    redirect(ROUTES.LOGIN);
  }

  return (
    <div className="space-y-6">
      <AuthPageHeading title="Verify your sign-in" />
      <VerifyTwoFactorForm challenge={challenge} />
    </div>
  );
}
