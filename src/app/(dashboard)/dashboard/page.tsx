import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import { PERMISSIONS } from "@/constants/permissions";
import { DashboardWorkspace } from "@/features/dashboard/components/dashboard-workspace";
import { hasAllPermissions } from "@/lib/authorization";
import { requirePageAccess } from "@/lib/page-guard";
import { getOverview } from "@/services/dashboard-service";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const access = await requirePageAccess(PERMISSIONS.DASHBOARD.VIEW);

  if (!access.allowed) {
    return (
      <PageContainer>
        <AccessDenied />
      </PageContainer>
    );
  }

  const overview = await getOverview();

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description="Summary of users, roles and branches across the organisation."
      />
      <DashboardWorkspace
        overview={overview}
        firstName={access.actor.user.firstName}
        canViewUsers={hasAllPermissions(access.actor, [PERMISSIONS.USERS.VIEW])}
        canViewRoles={hasAllPermissions(access.actor, [PERMISSIONS.ROLES.VIEW])}
        canViewBranches={hasAllPermissions(access.actor, [PERMISSIONS.BRANCHES.VIEW])}
      />
    </PageContainer>
  );
}
