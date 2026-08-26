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
  readonly generatedAt: string;
  readonly organizationName: string | null;
  readonly users: DashboardCount;
  readonly roles: DashboardCount;
  readonly branches: DashboardCount;
  readonly entities: DashboardCount;
  readonly usersByBranch: readonly DashboardSlice[];
  readonly usersByRole: readonly DashboardSlice[];
  readonly activity: readonly DashboardActivityItem[];
}

export interface DashboardModuleAccess {
  readonly view: boolean;
  readonly create: boolean;
}

/** Visibility follows the sidebar menus the actor can open, not leftover modules. */
export interface DashboardCapabilities {
  readonly users: DashboardModuleAccess;
  readonly roles: DashboardModuleAccess;
  readonly rolePermissions: DashboardModuleAccess;
  readonly branches: DashboardModuleAccess;
  readonly entities: DashboardModuleAccess;
  readonly settings: DashboardModuleAccess;
  readonly auditLogs: DashboardModuleAccess;
}

export interface DashboardOverviewModules {
  readonly users: boolean;
  readonly roles: boolean;
  readonly branches: boolean;
  readonly entities: boolean;
  readonly auditLogs: boolean;
}
