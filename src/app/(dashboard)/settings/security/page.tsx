import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ROUTES } from "@/constants/routes";
import { SecuritySettings } from "@/features/settings/components/security-settings";
import { loginHref } from "@/lib/login-href";
import {
  canEditOrgSecurityPolicies,
  canViewOrgSecurityPolicies,
} from "@/lib/security-policy-access";
import { getActorContext, requiresPasswordChange } from "@/lib/session";
import { getPasswordPolicy, getSecurityPolicy } from "@/services/settings-service";
import { getTwoFactorStatus } from "@/services/two-factor-service";

export const metadata: Metadata = { title: "Security" };

/** Own-account security: no module permission required, only a valid session. */
export default async function SecuritySettingsPage() {
  const actor = await getActorContext();

  if (!actor) {
    redirect(loginHref(ROUTES.SETTINGS_SECURITY));
  }

  const forced = await requiresPasswordChange();
  const canViewPolicy = canViewOrgSecurityPolicies(actor);
  const canEditPolicy = canEditOrgSecurityPolicies(actor);
  const [securityPolicy, passwordPolicy, twoFactor] = await Promise.all([
    canViewPolicy ? getSecurityPolicy() : Promise.resolve(null),
    getPasswordPolicy(),
    getTwoFactorStatus(actor),
  ]);

  return (
    <PageContainer>
      <PageHeader
        title="Security"
        description={
          canViewPolicy
            ? "Password, two-factor authentication, password policy, and inactive-account policy."
            : "Password and two-factor authentication for your own account."
        }
      />
      <SecuritySettings
        forced={forced}
        passwordPolicy={passwordPolicy.policy}
        passwordPolicySettings={canViewPolicy ? passwordPolicy : null}
        policy={securityPolicy}
        canEditPolicy={canEditPolicy}
        twoFactor={twoFactor}
      />
    </PageContainer>
  );
}
