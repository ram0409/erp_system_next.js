import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import { PERMISSIONS } from "@/constants/permissions";
import { AppearanceSettings } from "@/features/settings/components/appearance-settings";
import { requirePageAccess } from "@/lib/page-guard";

export const metadata: Metadata = { title: "General Settings" };

export default async function GeneralSettingsPage() {
  const access = await requirePageAccess(PERMISSIONS.SETTINGS.VIEW);

  if (!access.allowed) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="General Settings"
        description="Screen theme and accent colour for the console."
      />
      <AppearanceSettings />
    </PageContainer>
  );
}
