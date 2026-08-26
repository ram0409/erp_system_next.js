import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { AccessDenied } from "@/components/shared/access-denied";
import {
  NAVIGATION,
  filterNavigation,
  navigationHasHref,
} from "@/constants/navigation";
import { PERMISSIONS, type PermissionKey } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { DashboardWorkspace } from "@/features/dashboard/components/dashboard-workspace";
import { hasAllPermissions, permissionChecker } from "@/lib/authorization";
import { requirePageAccess } from "@/lib/page-guard";
import { getOverview } from "@/services/dashboard-service";
import type { DashboardCapabilities, DashboardModuleAccess } from "@/types/dashboard";
import type { ActorContext } from "@/types/session";
import { formatFullName } from "@/utils/format";

export const metadata: Metadata = { title: "Dashboard" };

function moduleAccess(
  visible: boolean,
  actor: ActorContext,
  create?: PermissionKey,
): DashboardModuleAccess {
  return {
    view: visible,
    create: visible && create ? hasAllPermissions(actor, [create]) : false,
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

  const { actor } = access;
  const menus = filterNavigation(NAVIGATION, permissionChecker(actor)).filter(
    (item) => !(item.kind === "link" && item.href === ROUTES.DASHBOARD),
  );
  const capabilities: DashboardCapabilities = {
    users: moduleAccess(
      navigationHasHref(menus, ROUTES.USERS),
      actor,
      PERMISSIONS.USERS.CREATE,
    ),
    roles: moduleAccess(navigationHasHref(menus, ROUTES.ROLES), actor),
    rolePermissions: moduleAccess(navigationHasHref(menus, ROUTES.ROLE_PERMISSIONS), actor),
    branches: moduleAccess(
      navigationHasHref(menus, ROUTES.BRANCHES),
      actor,
      PERMISSIONS.BRANCHES.CREATE,
    ),
    entities: moduleAccess(
      navigationHasHref(menus, ROUTES.ENTITY),
      actor,
      PERMISSIONS.ENTITIES.CREATE,
    ),
    settings: moduleAccess(navigationHasHref(menus, ROUTES.SETTINGS_GENERAL), actor),
    auditLogs: moduleAccess(navigationHasHref(menus, ROUTES.SETTINGS_AUDIT_LOGS), actor),
  };

  const overview = await getOverview({
    users: capabilities.users.view,
    roles: capabilities.roles.view,
    branches: capabilities.branches.view,
    entities: capabilities.entities.view,
    auditLogs: capabilities.auditLogs.view,
  });

  return (
    <PageContainer>
      <DashboardWorkspace
        overview={overview}
        displayName={formatFullName(actor.user.firstName, actor.user.lastName)}
        capabilities={capabilities}
        menus={menus}
      />
    </PageContainer>
  );
}
