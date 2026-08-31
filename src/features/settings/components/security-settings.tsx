"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PasswordPolicyId } from "@/constants/password-policy";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { InactivityPolicyForm } from "@/features/settings/components/inactivity-policy-form";
import { PasswordPolicyForm } from "@/features/settings/components/password-policy-form";
import { TwoFactorSettings } from "@/features/two-factor/components/two-factor-settings";
import type { PasswordPolicySettings, SecurityPolicy } from "@/types/settings";
import type { TwoFactorStatus } from "@/types/two-factor";

interface SecuritySettingsProps {
  readonly forced: boolean;
  readonly passwordPolicy: PasswordPolicyId;
  readonly passwordPolicySettings: PasswordPolicySettings | null;
  readonly policy: SecurityPolicy | null;
  readonly canEditPolicy: boolean;
  readonly twoFactor: TwoFactorStatus;
}

export function SecuritySettings({
  forced,
  passwordPolicy,
  passwordPolicySettings,
  policy,
  canEditPolicy,
  twoFactor,
}: SecuritySettingsProps) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Update the password for your own account.</CardDescription>
        </CardHeader>
        <CardContent className="max-w-md px-5 pb-5 sm:px-6">
          <ChangePasswordForm forced={forced} policy={passwordPolicy} />
        </CardContent>
      </Card>

      <TwoFactorSettings status={twoFactor} />

      {passwordPolicySettings ? (
        <PasswordPolicyForm settings={passwordPolicySettings} canEdit={canEditPolicy} />
      ) : null}

      {policy ? <InactivityPolicyForm policy={policy} canEdit={canEditPolicy} /> : null}
    </div>
  );
}
