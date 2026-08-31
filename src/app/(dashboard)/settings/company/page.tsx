import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import { PERMISSIONS } from "@/constants/permissions";
import { CompanyLogoCard } from "@/features/settings/components/company-logo-card";
import { GeneralSettingsForm } from "@/features/settings/components/general-settings-form";
import { hasAllPermissions } from "@/lib/authorization";
import { requirePageAccess } from "@/lib/page-guard";
import { getOrganizationSettings } from "@/services/settings-service";

export const metadata: Metadata = { title: "Company Details" };

export default async function CompanyDetailsPage() {
  const access = await requirePageAccess(PERMISSIONS.SETTINGS.VIEW);

  if (!access.allowed) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const settings = await getOrganizationSettings();
  const canEdit = hasAllPermissions(access.actor, [PERMISSIONS.SETTINGS.EDIT]);

  return (
    <PageContainer>
      <PageHeader
        title="Company Details"
        description="Company identity, contact details and the logo shown in the sidebar."
      />
      <div className="space-y-5">
        <CompanyLogoCard companyName={settings.name} logoUrl={settings.logoUrl} canEdit={canEdit} />
        <GeneralSettingsForm settings={settings} canEdit={canEdit} />
      </div>
    </PageContainer>
  );
}
