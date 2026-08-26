import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { AccessDenied } from "@/components/shared/access-denied";
import { PERMISSIONS, type PermissionKey } from "@/constants/permissions";
import { DashboardWorkspace } from "@/features/dashboard/components/dashboard-workspace";
import { hasAllPermissions } from "@/lib/authorization";
import { requirePageAccess } from "@/lib/page-guard";
import { getOverview } from "@/services/dashboard-service";
import type { ActorContext } from "@/types/session";
import { formatFullName } from "@/utils/format";

export const metadata: Metadata = { title: "Dashboard" };

function moduleAccess(actor: ActorContext, view: PermissionKey, create?: PermissionKey) {
  return {
    view: hasAllPermissions(actor, [view]),
    create: create ? hasAllPermissions(actor, [create]) : false,
  };
}

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
  const { actor } = access;

  return (
    <PageContainer>
      <DashboardWorkspace
        overview={overview}
        displayName={formatFullName(actor.user.firstName, actor.user.lastName)}
        capabilities={{
          users: moduleAccess(actor, PERMISSIONS.USERS.VIEW, PERMISSIONS.USERS.CREATE),
          roles: moduleAccess(actor, PERMISSIONS.ROLES.VIEW),
          branches: moduleAccess(actor, PERMISSIONS.BRANCHES.VIEW),
          employees: moduleAccess(actor, PERMISSIONS.EMPLOYEES.VIEW, PERMISSIONS.EMPLOYEES.CREATE),
          attendance: moduleAccess(
            actor,
            PERMISSIONS.ATTENDANCE.VIEW,
            PERMISSIONS.ATTENDANCE.CREATE,
          ),
          leave: moduleAccess(actor, PERMISSIONS.LEAVE.VIEW, PERMISSIONS.LEAVE.CREATE),
          holidays: moduleAccess(actor, PERMISSIONS.HOLIDAYS.VIEW),
          projects: moduleAccess(actor, PERMISSIONS.PROJECTS.VIEW, PERMISSIONS.PROJECTS.CREATE),
          tasks: moduleAccess(actor, PERMISSIONS.TASKS.VIEW, PERMISSIONS.TASKS.CREATE),
        }}
      />
    </PageContainer>
  );
}
