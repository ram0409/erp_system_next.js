import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { requiresPasswordChange } from "@/lib/session";
import { getPasswordPolicy } from "@/services/settings-service";

export const metadata: Metadata = { title: "Change password" };

export default async function ChangePasswordPage() {
  const [forced, passwordPolicy] = await Promise.all([
    requiresPasswordChange(),
    getPasswordPolicy(),
  ]);

  return (
    <PageContainer className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center">
      <div className="w-full max-w-md space-y-5">
        <PageHeader
          title="Change password"
          description="Update the password for your own account."
          className="text-center sm:flex-col sm:items-center"
        />
        <Card>
          <CardContent className="px-6 py-6 sm:px-8 sm:py-7">
            <ChangePasswordForm forced={forced} policy={passwordPolicy.policy} />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
