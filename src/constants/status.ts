/**
 * Record status shared by every master entity. Mirrored as a Prisma enum in
 * Phase 2 so the database and the application agree on the allowed values.
 */
export const RECORD_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

export type RecordStatus = (typeof RECORD_STATUS)[keyof typeof RECORD_STATUS];

export const RECORD_STATUS_LABELS: Readonly<Record<RecordStatus, string>> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

export const RECORD_STATUS_OPTIONS: readonly { value: RecordStatus; label: string }[] = [
  { value: RECORD_STATUS.ACTIVE, label: RECORD_STATUS_LABELS.ACTIVE },
  { value: RECORD_STATUS.INACTIVE, label: RECORD_STATUS_LABELS.INACTIVE },
];

/**
 * Seeded role slugs. Slugs are stable identifiers for code and seeds; the
 * display name stays editable by administrators.
 */
export const ROLE_SLUGS = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MANAGER: "manager",
  EMPLOYEE: "employee",
  VIEWER: "viewer",
} as const;

export type RoleSlug = (typeof ROLE_SLUGS)[keyof typeof ROLE_SLUGS];

export const BRANCH_TYPES = {
  HEAD_OFFICE: "HEAD_OFFICE",
  REGIONAL_OFFICE: "REGIONAL_OFFICE",
  WAREHOUSE: "WAREHOUSE",
  RETAIL_OUTLET: "RETAIL_OUTLET",
  FACTORY: "FACTORY",
} as const;

export type BranchType = (typeof BRANCH_TYPES)[keyof typeof BRANCH_TYPES];

export const BRANCH_TYPE_LABELS: Readonly<Record<BranchType, string>> = {
  HEAD_OFFICE: "Head Office",
  REGIONAL_OFFICE: "Regional Office",
  WAREHOUSE: "Warehouse",
  RETAIL_OUTLET: "Retail Outlet",
  FACTORY: "Factory",
};

export const BRANCH_TYPE_VALUES = [
  BRANCH_TYPES.HEAD_OFFICE,
  BRANCH_TYPES.REGIONAL_OFFICE,
  BRANCH_TYPES.WAREHOUSE,
  BRANCH_TYPES.RETAIL_OUTLET,
  BRANCH_TYPES.FACTORY,
] as const satisfies readonly BranchType[];

export const BRANCH_TYPE_OPTIONS: readonly { value: BranchType; label: string }[] =
  BRANCH_TYPE_VALUES.map((value) => ({ value, label: BRANCH_TYPE_LABELS[value] }));

export const RECORD_STATUS_VALUES = [
  RECORD_STATUS.ACTIVE,
  RECORD_STATUS.INACTIVE,
] as const satisfies readonly RecordStatus[];

export const AUDIT_ACTIONS = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  ACTIVATE: "ACTIVATE",
  DEACTIVATE: "DEACTIVATE",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  LOGIN_FAILED: "LOGIN_FAILED",
  PASSWORD_RESET_REQUESTED: "PASSWORD_RESET_REQUESTED",
  PASSWORD_RESET_COMPLETED: "PASSWORD_RESET_COMPLETED",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  PERMISSIONS_UPDATED: "PERMISSIONS_UPDATED",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export const AUDIT_ACTION_LABELS: Readonly<Record<AuditAction, string>> = {
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
  ACTIVATE: "Activated",
  DEACTIVATE: "Deactivated",
  LOGIN: "Signed in",
  LOGOUT: "Signed out",
  LOGIN_FAILED: "Sign-in failed",
  PASSWORD_RESET_REQUESTED: "Password reset requested",
  PASSWORD_RESET_COMPLETED: "Password reset completed",
  PASSWORD_CHANGED: "Password changed",
  PERMISSIONS_UPDATED: "Permissions updated",
};

export const AUDIT_ACTION_VALUES = [
  AUDIT_ACTIONS.CREATE,
  AUDIT_ACTIONS.UPDATE,
  AUDIT_ACTIONS.DELETE,
  AUDIT_ACTIONS.ACTIVATE,
  AUDIT_ACTIONS.DEACTIVATE,
  AUDIT_ACTIONS.LOGIN,
  AUDIT_ACTIONS.LOGOUT,
  AUDIT_ACTIONS.LOGIN_FAILED,
  AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
  AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
  AUDIT_ACTIONS.PASSWORD_CHANGED,
  AUDIT_ACTIONS.PERMISSIONS_UPDATED,
] as const satisfies readonly AuditAction[];

export const AUDIT_ACTION_OPTIONS: readonly { value: AuditAction; label: string }[] =
  AUDIT_ACTION_VALUES.map((value) => ({
    value,
    label: AUDIT_ACTION_LABELS[value],
  }));

export const ATTENDANCE_DAY_STATUS = {
  PRESENT: "PRESENT",
  ABSENT: "ABSENT",
  HALF_DAY: "HALF_DAY",
  ON_LEAVE: "ON_LEAVE",
  WEEK_OFF: "WEEK_OFF",
} as const;

export type AttendanceDayStatus =
  (typeof ATTENDANCE_DAY_STATUS)[keyof typeof ATTENDANCE_DAY_STATUS];

export const ATTENDANCE_DAY_STATUS_LABELS: Readonly<Record<AttendanceDayStatus, string>> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  HALF_DAY: "Half day",
  ON_LEAVE: "On leave",
  WEEK_OFF: "Week off",
};

export const ATTENDANCE_DAY_STATUS_VALUES = [
  ATTENDANCE_DAY_STATUS.PRESENT,
  ATTENDANCE_DAY_STATUS.ABSENT,
  ATTENDANCE_DAY_STATUS.HALF_DAY,
  ATTENDANCE_DAY_STATUS.ON_LEAVE,
  ATTENDANCE_DAY_STATUS.WEEK_OFF,
] as const satisfies readonly AttendanceDayStatus[];

export const ATTENDANCE_DAY_STATUS_OPTIONS: readonly {
  value: AttendanceDayStatus;
  label: string;
}[] = ATTENDANCE_DAY_STATUS_VALUES.map((value) => ({
  value,
  label: ATTENDANCE_DAY_STATUS_LABELS[value],
}));

export const LEAVE_TYPES = {
  CASUAL: "CASUAL",
  SICK: "SICK",
  EARNED: "EARNED",
  UNPAID: "UNPAID",
} as const;

export type LeaveType = (typeof LEAVE_TYPES)[keyof typeof LEAVE_TYPES];

export const LEAVE_TYPE_LABELS: Readonly<Record<LeaveType, string>> = {
  CASUAL: "Casual",
  SICK: "Sick",
  EARNED: "Earned",
  UNPAID: "Unpaid",
};

export const LEAVE_TYPE_VALUES = [
  LEAVE_TYPES.CASUAL,
  LEAVE_TYPES.SICK,
  LEAVE_TYPES.EARNED,
  LEAVE_TYPES.UNPAID,
] as const satisfies readonly LeaveType[];

export const LEAVE_TYPE_OPTIONS: readonly { value: LeaveType; label: string }[] =
  LEAVE_TYPE_VALUES.map((value) => ({ value, label: LEAVE_TYPE_LABELS[value] }));

export const LEAVE_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;

export type LeaveStatus = (typeof LEAVE_STATUS)[keyof typeof LEAVE_STATUS];

export const LEAVE_STATUS_LABELS: Readonly<Record<LeaveStatus, string>> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export const LEAVE_STATUS_VALUES = [
  LEAVE_STATUS.PENDING,
  LEAVE_STATUS.APPROVED,
  LEAVE_STATUS.REJECTED,
  LEAVE_STATUS.CANCELLED,
] as const satisfies readonly LeaveStatus[];

export const LEAVE_STATUS_OPTIONS: readonly { value: LeaveStatus; label: string }[] =
  LEAVE_STATUS_VALUES.map((value) => ({ value, label: LEAVE_STATUS_LABELS[value] }));

export const HOLIDAY_TYPES = {
  NATIONAL: "NATIONAL",
  OPTIONAL: "OPTIONAL",
  COMPANY: "COMPANY",
} as const;

export type HolidayType = (typeof HOLIDAY_TYPES)[keyof typeof HOLIDAY_TYPES];

export const HOLIDAY_TYPE_LABELS: Readonly<Record<HolidayType, string>> = {
  NATIONAL: "National",
  OPTIONAL: "Optional",
  COMPANY: "Company",
};

export const HOLIDAY_TYPE_VALUES = [
  HOLIDAY_TYPES.NATIONAL,
  HOLIDAY_TYPES.OPTIONAL,
  HOLIDAY_TYPES.COMPANY,
] as const satisfies readonly HolidayType[];

export const HOLIDAY_TYPE_OPTIONS: readonly { value: HolidayType; label: string }[] =
  HOLIDAY_TYPE_VALUES.map((value) => ({ value, label: HOLIDAY_TYPE_LABELS[value] }));

export const PROJECT_STATUS = {
  PLANNED: "PLANNED",
  ACTIVE: "ACTIVE",
  ON_HOLD: "ON_HOLD",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type ProjectStatus = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

export const PROJECT_STATUS_LABELS: Readonly<Record<ProjectStatus, string>> = {
  PLANNED: "Planned",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const PROJECT_STATUS_VALUES = [
  PROJECT_STATUS.PLANNED,
  PROJECT_STATUS.ACTIVE,
  PROJECT_STATUS.ON_HOLD,
  PROJECT_STATUS.COMPLETED,
  PROJECT_STATUS.CANCELLED,
] as const satisfies readonly ProjectStatus[];

export const PROJECT_STATUS_OPTIONS: readonly { value: ProjectStatus; label: string }[] =
  PROJECT_STATUS_VALUES.map((value) => ({ value, label: PROJECT_STATUS_LABELS[value] }));

export const TASK_STATUS = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  BLOCKED: "BLOCKED",
  DONE: "DONE",
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export const TASK_STATUS_LABELS: Readonly<Record<TaskStatus, string>> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
};

export const TASK_STATUS_VALUES = [
  TASK_STATUS.TODO,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.BLOCKED,
  TASK_STATUS.DONE,
] as const satisfies readonly TaskStatus[];

export const TASK_STATUS_OPTIONS: readonly { value: TaskStatus; label: string }[] =
  TASK_STATUS_VALUES.map((value) => ({ value, label: TASK_STATUS_LABELS[value] }));
