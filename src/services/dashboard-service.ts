import "server-only";

import { DASHBOARD_ACTIVITY_LIMIT, DASHBOARD_CHART_LIMIT, DASHBOARD_FEED_EXCLUDED_ACTIONS } from "@/constants/dashboard";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { ROUTES } from "@/constants/routes";
import { AUDIT_ACTION_LABELS, RECORD_STATUS, type RecordStatus } from "@/constants/status";
import { foldDistribution } from "@/lib/dashboard-distribution";
import { getWorkspaceScope } from "@/lib/workspace-scope";
import * as auditRepository from "@/repositories/audit-repository";
import * as branchRepository from "@/repositories/branch-repository";
import * as organizationRepository from "@/repositories/organization-repository";
import * as roleRepository from "@/repositories/role-repository";
import * as userRepository from "@/repositories/user-repository";
import type {
  DashboardCount,
  DashboardOverview,
  DashboardOverviewModules,
  DashboardSlice,
} from "@/types/dashboard";

const EMPTY_COUNT: DashboardCount = { total: 0, active: 0, inactive: 0 };

function toCount(rows: readonly { status: RecordStatus; count: number }[]): DashboardCount {
  const active = rows.find((row) => row.status === RECORD_STATUS.ACTIVE)?.count ?? 0;
  const inactive = rows.find((row) => row.status === RECORD_STATUS.INACTIVE)?.count ?? 0;
  return { total: active + inactive, active, inactive };
}

function emptyWhen<T>(enabled: boolean, load: () => Promise<T>, fallback: T): Promise<T> {
  return enabled ? load() : Promise.resolve(fallback);
}

export async function getOverview(modules: DashboardOverviewModules): Promise<DashboardOverview> {
  const scope = await getWorkspaceScope();
  const branchId = scope?.branchId;

  const [organization, userStatus, roleStatus, branchStatus, byBranch, byRole, activity] =
    await Promise.all([
      organizationRepository.findPrimary(),
      emptyWhen(modules.users, () => userRepository.countByStatus(branchId), []),
      emptyWhen(modules.roles, () => roleRepository.countByStatus(), []),
      emptyWhen(modules.branches, () => branchRepository.countByStatus(), []),
      emptyWhen(modules.users, () => userRepository.countGroupedByBranch(branchId), []),
      emptyWhen(modules.users, () => userRepository.countGroupedByRole(branchId), []),
      emptyWhen(
        modules.auditLogs,
        () => auditRepository.listRecent(DASHBOARD_ACTIVITY_LIMIT, DASHBOARD_FEED_EXCLUDED_ACTIONS),
        [],
      ),
    ]);

  const usersByBranch: DashboardSlice[] = byBranch.map((row) => ({
    key: row.publicId,
    label: row.name,
    count: row.count,
    href: ROUTES.USERS,
  }));

  const usersByRole: DashboardSlice[] = byRole.map((row) => ({
    key: row.publicId,
    label: row.name,
    count: row.count,
    href: `${ROUTES.USERS}?${TABLE_QUERY_KEYS.ROLE}=${encodeURIComponent(row.publicId)}`,
  }));

  return {
    generatedAt: new Date().toISOString(),
    organizationName: organization?.name ?? null,
    users: modules.users ? toCount(userStatus) : EMPTY_COUNT,
    roles: modules.roles ? toCount(roleStatus) : EMPTY_COUNT,
    branches: modules.branches ? toCount(branchStatus) : EMPTY_COUNT,
    usersByBranch: foldDistribution(usersByBranch, DASHBOARD_CHART_LIMIT),
    usersByRole: foldDistribution(usersByRole, DASHBOARD_CHART_LIMIT),
    activity: activity.map((row, index) => ({
      key: `${row.createdAt.toISOString()}-${row.action}-${row.entityType}-${index}`,
      action: row.action,
      actionLabel: AUDIT_ACTION_LABELS[row.action],
      actorName: row.actorName,
      entityType: row.entityType,
      summary: row.summary,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
