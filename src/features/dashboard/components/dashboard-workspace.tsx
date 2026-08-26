import {
  Building2Icon,
  CalendarOffIcon,
  ClipboardCheckIcon,
  FolderKanbanIcon,
  ListTodoIcon,
  UsersIcon,
} from "lucide-react";

import { DashboardActivityFeed } from "@/components/dashboard/activity-feed";
import { DashboardAttentionPanel } from "@/components/dashboard/attention-panel";
import { DashboardDistributionChart } from "@/components/dashboard/distribution-chart";
import { DashboardKpiCard } from "@/components/dashboard/kpi-card";
import { DashboardQuickActions } from "@/components/dashboard/quick-actions";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { ROUTES } from "@/constants/routes";
import { ATTENDANCE_DAY_STATUS, LEAVE_STATUS } from "@/constants/status";
import type { DashboardCapabilities, DashboardOverview } from "@/types/dashboard";
import { DEFAULT_LOCALE, DEFAULT_TIME_ZONE, formatNumber } from "@/utils/format";

interface DashboardWorkspaceProps {
  readonly overview: DashboardOverview;
  readonly displayName: string;
  readonly capabilities: DashboardCapabilities;
}

function greetingFor(now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: DEFAULT_TIME_ZONE,
    }).format(now),
  );

  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 17) {
    return "Good afternoon";
  }
  return "Good evening";
}

export function DashboardWorkspace({ overview, displayName, capabilities }: DashboardWorkspaceProps) {
  const now = new Date(overview.generatedAt);
  const todayLabel = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: DEFAULT_TIME_ZONE,
  }).format(now);

  const presentHint =
    overview.attendanceToday.recorded === 0
      ? "No attendance marked yet today"
      : `${formatNumber(overview.attendanceToday.absent)} absent · ${formatNumber(overview.attendanceToday.onLeave)} on leave`;

  return (
    <div className="space-y-5">
      <section className="from-primary/14 via-info/8 to-card relative overflow-hidden rounded-2xl border bg-gradient-to-br px-5 py-6 sm:px-7">
        <p className="text-muted-foreground text-sm">{todayLabel}</p>
        <h2 className="text-foreground mt-1 text-[1.65rem] font-semibold tracking-tight">
          {greetingFor(now)}, {displayName}
        </h2>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
          {overview.organizationName
            ? `Operations snapshot for ${overview.organizationName}.`
            : "Operations snapshot for the organisation."}{" "}
          Workforce, attendance, leave and delivery in one place.
        </p>
        <div className="mt-5">
          <DashboardQuickActions capabilities={capabilities} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardKpiCard
          label="Employees"
          value={overview.employees.total}
          hint={`${formatNumber(overview.employees.active)} active · ${formatNumber(overview.employees.inactive)} inactive`}
          icon={UsersIcon}
          href={capabilities.employees.view ? ROUTES.EMPLOYEES : undefined}
          tone="brand"
        />
        <DashboardKpiCard
          label="Present today"
          value={overview.attendanceToday.present}
          hint={presentHint}
          icon={ClipboardCheckIcon}
          href={
            capabilities.attendance.view
              ? `${ROUTES.ATTENDANCE}?${TABLE_QUERY_KEYS.STATUS}=${ATTENDANCE_DAY_STATUS.PRESENT}`
              : undefined
          }
          tone="success"
        />
        <DashboardKpiCard
          label="Pending leave"
          value={overview.leavePending}
          hint={`${formatNumber(overview.leaveApproved)} approved requests on file`}
          icon={CalendarOffIcon}
          href={
            capabilities.leave.view
              ? `${ROUTES.LEAVE}?${TABLE_QUERY_KEYS.STATUS}=${LEAVE_STATUS.PENDING}`
              : undefined
          }
          tone="warning"
        />
        <DashboardKpiCard
          label="Active projects"
          value={overview.projectsActive}
          hint={`${formatNumber(overview.projectsTotal)} projects in the portfolio`}
          icon={FolderKanbanIcon}
          href={capabilities.projects.view ? ROUTES.PROJECTS : undefined}
          tone="info"
        />
        <DashboardKpiCard
          label="Open tasks"
          value={overview.tasksOpen}
          hint={
            overview.tasksBlocked > 0
              ? `${formatNumber(overview.tasksBlocked)} blocked · ${formatNumber(overview.tasksTotal)} total`
              : `${formatNumber(overview.tasksTotal)} tasks in all statuses`
          }
          icon={ListTodoIcon}
          href={capabilities.tasks.view ? ROUTES.TASKS : undefined}
          tone="brand"
        />
        <DashboardKpiCard
          label="Branches"
          value={overview.branches.total}
          hint={`${formatNumber(overview.branches.active)} active · ${formatNumber(overview.branches.inactive)} inactive`}
          icon={Building2Icon}
          href={capabilities.branches.view ? ROUTES.BRANCHES : undefined}
          tone="muted"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="grid gap-4 xl:col-span-2 lg:grid-cols-2">
          <DashboardDistributionChart
            title="Projects by status"
            description="How work is spread across the portfolio."
            emptyTitle="No projects to chart yet"
            items={overview.projectsByStatus}
            linkSlices={capabilities.projects.view}
            variant="mix"
          />
          <DashboardDistributionChart
            title="Tasks by status"
            description="Delivery pipeline across all projects."
            emptyTitle="No tasks to chart yet"
            items={overview.tasksByStatus}
            linkSlices={capabilities.tasks.view}
            variant="mix"
          />
        </div>
        <DashboardAttentionPanel
          leavePending={overview.leavePending}
          tasksBlocked={overview.tasksBlocked}
          holidays={overview.upcomingHolidays}
          capabilities={capabilities}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <DashboardDistributionChart
          title="People by branch"
          description="Live accounts assigned to each branch."
          emptyTitle="No people to chart yet"
          items={overview.usersByBranch}
          linkSlices={capabilities.users.view}
        />
        <DashboardDistributionChart
          title="People by role"
          description="Live accounts assigned to each role."
          emptyTitle="No people to chart yet"
          items={overview.usersByRole}
          linkSlices={capabilities.users.view}
        />
      </section>

      <DashboardActivityFeed items={overview.activity} />
    </div>
  );
}
