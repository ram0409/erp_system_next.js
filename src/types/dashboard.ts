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

export interface DashboardAttendanceToday {
  readonly present: number;
  readonly absent: number;
  readonly halfDay: number;
  readonly onLeave: number;
  readonly weekOff: number;
  readonly recorded: number;
}

export interface DashboardHolidayItem {
  readonly key: string;
  readonly name: string;
  readonly date: string;
  readonly typeLabel: string;
}

export interface DashboardOverview {
  readonly generatedAt: string;
  readonly organizationName: string | null;
  readonly users: DashboardCount;
  readonly employees: DashboardCount;
  readonly roles: DashboardCount;
  readonly branches: DashboardCount;
  readonly attendanceToday: DashboardAttendanceToday;
  readonly leavePending: number;
  readonly leaveApproved: number;
  readonly projectsActive: number;
  readonly projectsTotal: number;
  readonly tasksOpen: number;
  readonly tasksBlocked: number;
  readonly tasksTotal: number;
  readonly usersByBranch: readonly DashboardSlice[];
  readonly usersByRole: readonly DashboardSlice[];
  readonly projectsByStatus: readonly DashboardSlice[];
  readonly tasksByStatus: readonly DashboardSlice[];
  readonly upcomingHolidays: readonly DashboardHolidayItem[];
  readonly activity: readonly DashboardActivityItem[];
}

export interface DashboardModuleAccess {
  readonly view: boolean;
  readonly create: boolean;
}

export interface DashboardCapabilities {
  readonly users: DashboardModuleAccess;
  readonly roles: DashboardModuleAccess;
  readonly branches: DashboardModuleAccess;
  readonly employees: DashboardModuleAccess;
  readonly attendance: DashboardModuleAccess;
  readonly leave: DashboardModuleAccess;
  readonly holidays: DashboardModuleAccess;
  readonly projects: DashboardModuleAccess;
  readonly tasks: DashboardModuleAccess;
}
