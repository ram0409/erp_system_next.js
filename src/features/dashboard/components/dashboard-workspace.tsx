import {
  BuildingIcon,
  LandmarkIcon,
  UserCogIcon,
  UsersIcon,
} from "lucide-react";

import { DashboardActivityFeed } from "@/components/dashboard/activity-feed";
import { DashboardDistributionChart } from "@/components/dashboard/distribution-chart";
import { DashboardKpiCard } from "@/components/dashboard/kpi-card";
import { DashboardMenuPanel } from "@/components/dashboard/menu-panel";
import { DashboardQuickActions } from "@/components/dashboard/quick-actions";
import type { NavItem } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import type { DashboardCapabilities, DashboardOverview } from "@/types/dashboard";
import { DEFAULT_LOCALE, DEFAULT_TIME_ZONE, formatNumber } from "@/utils/format";

interface DashboardWorkspaceProps {
  readonly overview: DashboardOverview;
  readonly displayName: string;
  readonly capabilities: DashboardCapabilities;
  readonly menus: readonly NavItem[];
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

export function DashboardWorkspace({
  overview,
  displayName,
  capabilities,
  menus,
}: DashboardWorkspaceProps) {
  const now = new Date(overview.generatedAt);
  const todayLabel = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: DEFAULT_TIME_ZONE,
  }).format(now);

  const kpiCards = [
    capabilities.users.view
      ? {
          key: "users",
          label: "Users",
          value: overview.users.total,
          hint: `${formatNumber(overview.users.active)} active · ${formatNumber(overview.users.inactive)} inactive`,
          icon: UsersIcon,
          href: ROUTES.USERS,
          tone: "brand" as const,
        }
      : null,
    capabilities.roles.view
      ? {
          key: "roles",
          label: "Roles",
          value: overview.roles.total,
          hint: `${formatNumber(overview.roles.active)} active · ${formatNumber(overview.roles.inactive)} inactive`,
          icon: UserCogIcon,
          href: ROUTES.ROLES,
          tone: "info" as const,
        }
      : null,
    capabilities.branches.view
      ? {
          key: "branches",
          label: "Branches",
          value: overview.branches.total,
          hint: `${formatNumber(overview.branches.active)} active · ${formatNumber(overview.branches.inactive)} inactive`,
          icon: BuildingIcon,
          href: ROUTES.BRANCHES,
          tone: "muted" as const,
        }
      : null,
    capabilities.entities.view
      ? {
          key: "entities",
          label: "Entities",
          value: overview.entities.total,
          hint: `${formatNumber(overview.entities.active)} active · ${formatNumber(overview.entities.inactive)} inactive`,
          icon: LandmarkIcon,
          href: ROUTES.ENTITY,
          tone: "success" as const,
        }
      : null,
  ].filter((card) => card !== null);

  return (
    <div className="space-y-5">
      <section className="dashboard-hero relative overflow-hidden rounded-xl border px-5 py-5 sm:px-6">
        <p className="text-muted-foreground text-sm">{todayLabel}</p>
        <h2 className="text-foreground mt-1 text-2xl font-semibold tracking-tight">
          {greetingFor(now)}, {displayName}
        </h2>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
          {overview.organizationName
            ? `Snapshot for ${overview.organizationName}.`
            : "Snapshot for the organisation."}{" "}
          Figures follow the Entity and Branch in the header, and only the menus you can open.
        </p>
        <div className="mt-4">
          <DashboardQuickActions capabilities={capabilities} />
        </div>
      </section>

      {kpiCards.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card) => (
            <DashboardKpiCard
              key={card.key}
              label={card.label}
              value={card.value}
              hint={card.hint}
              icon={card.icon}
              href={card.href}
              tone={card.tone}
            />
          ))}
        </section>
      ) : null}

      {capabilities.users.view ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <DashboardDistributionChart
            title="People by branch"
            description="Accounts in the selected workspace branch."
            emptyTitle="No people to chart yet"
            items={overview.usersByBranch}
            linkSlices
          />
          <DashboardDistributionChart
            title="People by role"
            description="Accounts in this workspace, grouped by role."
            emptyTitle="No people to chart yet"
            items={overview.usersByRole}
            linkSlices
          />
        </section>
      ) : null}

      <section className={capabilities.auditLogs.view ? "grid gap-4 xl:grid-cols-3" : undefined}>
        <div className={capabilities.auditLogs.view ? "xl:col-span-1" : undefined}>
          <DashboardMenuPanel items={menus} />
        </div>
        {capabilities.auditLogs.view ? (
          <div className="xl:col-span-2">
            <DashboardActivityFeed items={overview.activity} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
