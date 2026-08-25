import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import { PERMISSIONS } from "@/constants/permissions";
import { GeneralSettingsForm } from "@/features/settings/components/general-settings-form";
import { hasAllPermissions } from "@/lib/authorization";
import { requirePageAccess } from "@/lib/page-guard";
import { getOrganizationSettings } from "@/services/settings-service";

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

  const settings = await getOrganizationSettings();

  return (
    <PageContainer>
      <PageHeader
        title="General Settings"
        description="Organisation identity and contact details used across the console."
      />
      <GeneralSettingsForm
        settings={settings}
        canEdit={hasAllPermissions(access.actor, [PERMISSIONS.SETTINGS.EDIT])}
      />
    </PageContainer>
  );
}
