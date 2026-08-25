export interface DashboardCount {
  readonly total: number;
  readonly active: number;
  readonly inactive: number;
}

export interface DashboardSlice {
  readonly key: string;
  readonly label: string;
  readonly count: number;
  readonly href?: string;
}

export interface DashboardActivityItem {
  readonly key: string;
  readonly action: string;
  readonly actionLabel: string;
  readonly actorName: string | null;
  readonly entityType: string;
  readonly summary: string | null;
  readonly createdAt: string;
}

export interface DashboardOverview {
  readonly users: DashboardCount;
  readonly roles: DashboardCount;
  readonly branches: DashboardCount;
  readonly usersByBranch: readonly DashboardSlice[];
  readonly usersByRole: readonly DashboardSlice[];
  readonly activity: readonly DashboardActivityItem[];
}
