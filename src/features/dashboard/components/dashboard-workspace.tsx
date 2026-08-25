import { Building2Icon, ShieldIcon, UsersIcon } from "lucide-react";

import { DashboardActivityFeed } from "@/components/dashboard/activity-feed";
import { DashboardDistributionChart } from "@/components/dashboard/distribution-chart";
import { DashboardKpiCard } from "@/components/dashboard/kpi-card";
import { ROUTES } from "@/constants/routes";
import { formatNumber } from "@/utils/format";
import type { DashboardOverview } from "@/types/dashboard";

interface DashboardWorkspaceProps {
  readonly overview: DashboardOverview;
  readonly firstName: string;
  readonly canViewUsers: boolean;
  readonly canViewRoles: boolean;
  readonly canViewBranches: boolean;
}

export function DashboardWorkspace({
  overview,
  firstName,
  canViewUsers,
  canViewRoles,
  canViewBranches,
}: DashboardWorkspaceProps) {
  return (
    <div className="space-y-5">
      <p className="text-muted-foreground text-sm">Welcome back, {firstName}.</p>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardKpiCard
          label="Users"
          value={overview.users.total}
          hint={`${formatNumber(overview.users.active)} active · ${formatNumber(overview.users.inactive)} inactive`}
          icon={UsersIcon}
          href={canViewUsers ? ROUTES.USERS : undefined}
        />
        <DashboardKpiCard
          label="Roles"
          value={overview.roles.total}
          hint={`${formatNumber(overview.roles.active)} active · ${formatNumber(overview.roles.inactive)} inactive`}
          icon={ShieldIcon}
          href={canViewRoles ? ROUTES.ROLES : undefined}
        />
        <DashboardKpiCard
          label="Branches"
          value={overview.branches.total}
          hint={`${formatNumber(overview.branches.active)} active · ${formatNumber(overview.branches.inactive)} inactive`}
          icon={Building2Icon}
          href={canViewBranches ? ROUTES.BRANCHES : undefined}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <DashboardDistributionChart
          title="Users by branch"
          description="Live accounts assigned to each branch."
          emptyTitle="No users to chart yet"
          items={overview.usersByBranch}
          linkSlices={canViewUsers}
        />
        <DashboardDistributionChart
          title="Users by role"
          description="Live accounts assigned to each role."
          emptyTitle="No users to chart yet"
          items={overview.usersByRole}
          linkSlices={canViewUsers}
        />
      </section>

      <DashboardActivityFeed items={overview.activity} />
    </div>
  );
}
