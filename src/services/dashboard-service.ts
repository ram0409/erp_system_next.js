import "server-only";

import {
  DASHBOARD_ACTIVITY_LIMIT,
  DASHBOARD_CHART_LIMIT,
  DASHBOARD_FEED_EXCLUDED_ACTIONS,
  DASHBOARD_HOLIDAY_LIMIT,
} from "@/constants/dashboard";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { ROUTES } from "@/constants/routes";
import {
  ATTENDANCE_DAY_STATUS,
  AUDIT_ACTION_LABELS,
  HOLIDAY_TYPE_LABELS,
  LEAVE_STATUS,
  PROJECT_STATUS,
  PROJECT_STATUS_LABELS,
  RECORD_STATUS,
  type RecordStatus,
  TASK_STATUS,
  TASK_STATUS_LABELS,
} from "@/constants/status";
import { foldDistribution } from "@/lib/dashboard-distribution";
import * as attendanceRepository from "@/repositories/attendance-repository";
import * as auditRepository from "@/repositories/audit-repository";
import * as branchRepository from "@/repositories/branch-repository";
import * as holidayRepository from "@/repositories/holiday-repository";
import * as leaveRepository from "@/repositories/leave-repository";
import * as organizationRepository from "@/repositories/organization-repository";
import * as projectRepository from "@/repositories/project-repository";
import * as roleRepository from "@/repositories/role-repository";
import * as taskRepository from "@/repositories/task-repository";
import * as userRepository from "@/repositories/user-repository";
import type {
  DashboardAttendanceToday,
  DashboardCount,
  DashboardOverview,
  DashboardSlice,
} from "@/types/dashboard";
import { DEFAULT_TIME_ZONE } from "@/utils/format";

function toCount(rows: readonly { status: RecordStatus; count: number }[]): DashboardCount {
  const active = rows.find((row) => row.status === RECORD_STATUS.ACTIVE)?.count ?? 0;
  const inactive = rows.find((row) => row.status === RECORD_STATUS.INACTIVE)?.count ?? 0;
  return { total: active + inactive, active, inactive };
}

function countOf<T extends string>(rows: readonly { status: T; count: number }[], status: T): number {
  return rows.find((row) => row.status === status)?.count ?? 0;
}

/** Calendar date in the organisation timezone, stored the same way attendance days are. */
function todayAsUtcDate(): Date {
  const isoDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function slicesFromStatus<T extends string>(
  rows: readonly { status: T; count: number }[],
  labels: Readonly<Record<T, string>>,
  hrefFor: (status: T) => string,
): DashboardSlice[] {
  return rows
    .filter((row) => row.count > 0)
    .map((row) => ({
      key: row.status,
      label: labels[row.status],
      count: row.count,
      href: hrefFor(row.status),
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

export async function getOverview(): Promise<DashboardOverview> {
  const today = todayAsUtcDate();

  const [
    organization,
    userStatus,
    employeeStatus,
    roleStatus,
    branchStatus,
    attendanceTodayRows,
    leaveStatus,
    projectStatus,
    taskStatus,
    byBranch,
    byRole,
    holidays,
    activity,
  ] = await Promise.all([
    organizationRepository.findPrimary(),
    userRepository.countByStatus(),
    userRepository.countEmployeesByStatus(),
    roleRepository.countByStatus(),
    branchRepository.countByStatus(),
    attendanceRepository.countByStatusForDate(today),
    leaveRepository.countByStatus(),
    projectRepository.countByStatus(),
    taskRepository.countByStatus(),
    userRepository.countGroupedByBranch(),
    userRepository.countGroupedByRole(),
    holidayRepository.listUpcoming(today, DASHBOARD_HOLIDAY_LIMIT),
    auditRepository.listRecent(DASHBOARD_ACTIVITY_LIMIT, DASHBOARD_FEED_EXCLUDED_ACTIONS),
  ]);

  const usersByBranch: DashboardSlice[] = byBranch.map((row) => ({
    key: row.publicId,
    label: row.name,
    count: row.count,
    href: `${ROUTES.USERS}?${TABLE_QUERY_KEYS.BRANCH}=${encodeURIComponent(row.publicId)}`,
  }));

  const usersByRole: DashboardSlice[] = byRole.map((row) => ({
    key: row.publicId,
    label: row.name,
    count: row.count,
    href: `${ROUTES.USERS}?${TABLE_QUERY_KEYS.ROLE}=${encodeURIComponent(row.publicId)}`,
  }));

  const attendanceToday: DashboardAttendanceToday = {
    present: countOf(attendanceTodayRows, ATTENDANCE_DAY_STATUS.PRESENT),
    absent: countOf(attendanceTodayRows, ATTENDANCE_DAY_STATUS.ABSENT),
    halfDay: countOf(attendanceTodayRows, ATTENDANCE_DAY_STATUS.HALF_DAY),
    onLeave: countOf(attendanceTodayRows, ATTENDANCE_DAY_STATUS.ON_LEAVE),
    weekOff: countOf(attendanceTodayRows, ATTENDANCE_DAY_STATUS.WEEK_OFF),
    recorded: attendanceTodayRows.reduce((sum, row) => sum + row.count, 0),
  };

  const todo = countOf(taskStatus, TASK_STATUS.TODO);
  const inProgress = countOf(taskStatus, TASK_STATUS.IN_PROGRESS);
  const blocked = countOf(taskStatus, TASK_STATUS.BLOCKED);
  const done = countOf(taskStatus, TASK_STATUS.DONE);

  return {
    generatedAt: new Date().toISOString(),
    organizationName: organization?.name ?? null,
    users: toCount(userStatus),
    employees: toCount(employeeStatus),
    roles: toCount(roleStatus),
    branches: toCount(branchStatus),
    attendanceToday,
    leavePending: countOf(leaveStatus, LEAVE_STATUS.PENDING),
    leaveApproved: countOf(leaveStatus, LEAVE_STATUS.APPROVED),
    projectsActive: countOf(projectStatus, PROJECT_STATUS.ACTIVE),
    projectsTotal: projectStatus.reduce((sum, row) => sum + row.count, 0),
    tasksOpen: todo + inProgress + blocked,
    tasksBlocked: blocked,
    tasksTotal: todo + inProgress + blocked + done,
    usersByBranch: foldDistribution(usersByBranch, DASHBOARD_CHART_LIMIT),
    usersByRole: foldDistribution(usersByRole, DASHBOARD_CHART_LIMIT),
    projectsByStatus: slicesFromStatus(
      projectStatus,
      PROJECT_STATUS_LABELS,
      (status) => `${ROUTES.PROJECTS}?${TABLE_QUERY_KEYS.STATUS}=${encodeURIComponent(status)}`,
    ),
    tasksByStatus: slicesFromStatus(
      taskStatus,
      TASK_STATUS_LABELS,
      (status) => `${ROUTES.TASKS}?${TABLE_QUERY_KEYS.STATUS}=${encodeURIComponent(status)}`,
    ),
    upcomingHolidays: holidays.map((row) => ({
      key: row.publicId,
      name: row.name,
      date: row.holidayDate.toISOString(),
      typeLabel: HOLIDAY_TYPE_LABELS[row.type],
    })),
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
