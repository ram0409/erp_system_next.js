import "server-only";

import {
  DASHBOARD_ACTIVITY_LIMIT,
  DASHBOARD_CHART_LIMIT,
  DASHBOARD_FEED_EXCLUDED_ACTIONS,
} from "@/constants/dashboard";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { ROUTES } from "@/constants/routes";
import { AUDIT_ACTION_LABELS, RECORD_STATUS, type RecordStatus } from "@/constants/status";
import { foldDistribution } from "@/lib/dashboard-distribution";
import * as auditRepository from "@/repositories/audit-repository";
import * as branchRepository from "@/repositories/branch-repository";
import * as roleRepository from "@/repositories/role-repository";
import * as userRepository from "@/repositories/user-repository";
import type { DashboardCount, DashboardOverview, DashboardSlice } from "@/types/dashboard";

function toCount(rows: readonly { status: RecordStatus; count: number }[]): DashboardCount {
  const active = rows.find((row) => row.status === RECORD_STATUS.ACTIVE)?.count ?? 0;
  const inactive = rows.find((row) => row.status === RECORD_STATUS.INACTIVE)?.count ?? 0;
  return { total: active + inactive, active, inactive };
}

export async function getOverview(): Promise<DashboardOverview> {
  const [userStatus, roleStatus, branchStatus, byBranch, byRole, activity] = await Promise.all([
    userRepository.countByStatus(),
    roleRepository.countByStatus(),
    branchRepository.countByStatus(),
    userRepository.countGroupedByBranch(),
    userRepository.countGroupedByRole(),
    auditRepository.listRecent(DASHBOARD_ACTIVITY_LIMIT, DASHBOARD_FEED_EXCLUDED_ACTIONS),
  ]);

  const usersByBranch: DashboardSlice[] = byBranch.map((row) => ({
    key: row.publicId,
    label: `${row.code} · ${row.name}`,
    count: row.count,
    href: `${ROUTES.USERS}?${TABLE_QUERY_KEYS.BRANCH}=${encodeURIComponent(row.publicId)}`,
  }));

  const usersByRole: DashboardSlice[] = byRole.map((row) => ({
    key: row.publicId,
    label: row.name,
    count: row.count,
    href: `${ROUTES.USERS}?${TABLE_QUERY_KEYS.ROLE}=${encodeURIComponent(row.publicId)}`,
  }));

  return {
    users: toCount(userStatus),
    roles: toCount(roleStatus),
    branches: toCount(branchStatus),
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
