/**
 * User-facing copy lives here so wording stays consistent and, critically, so
 * that error text shown to a browser can never accidentally carry internal detail.
 */
export const ERROR_MESSAGES = {
  GENERIC: "Unable to complete the request. Please try again.",
  UNAUTHENTICATED: "Your session has expired. Please sign in again.",
  FORBIDDEN: "You do not have permission to perform this action.",
  NOT_FOUND: "The requested record could not be found.",
  VALIDATION: "Please correct the highlighted fields and try again.",
  CONFLICT: "That change conflicts with an existing record.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
  INVALID_CREDENTIALS: "The email or password you entered is incorrect.",
  ACCOUNT_INACTIVE: "This account is inactive. Contact your administrator.",
  PASSWORD_RESET_INVALID: "This reset link is invalid or has expired.",
} as const;

export const SUCCESS_MESSAGES = {
  CREATED: "Record created successfully.",
  UPDATED: "Changes saved successfully.",
  ACTIVATED: "Record activated successfully.",
  DEACTIVATED: "Record deactivated successfully.",
  DELETED: "Record deleted successfully.",
  EXPORTED: "Export ready.",
  PERMISSIONS_SAVED: "Permissions updated successfully.",
  PASSWORD_CHANGED: "Password changed successfully.",
  PASSWORD_RESET_SENT: "If an account exists for that email, a password reset link has been sent.",
  PASSWORD_RESET: "Your password has been updated. Sign in with your new password.",
  PASSWORD_RESET_LINK_SENT: "A password reset email has been sent.",
  AVATAR_UPDATED: "Profile photo updated.",
  AVATAR_REMOVED: "Profile photo removed.",
} as const;

export const EMPTY_STATE_MESSAGES = {
  NO_RESULTS: "No records match your search.",
  NO_RECORDS: "No records yet.",
} as const;

export const UNSAVED_CHANGES_PROMPT =
  "You have unsaved changes. Are you sure you want to leave this page?";

/** Branch-master rule copy. Kept here so the service and the UI stay in sync. */
export const BRANCH_MESSAGES = {
  CODE_TAKEN: "Branch code is already in use.",
  NAME_TAKEN: "Branch name is already in use.",
  OWN_BRANCH_DEACTIVATE: "You cannot deactivate the branch you are signed in to.",
  OWN_BRANCH_DELETE: "You cannot delete the branch you are signed in to.",
  HEAD_OFFICE_DEACTIVATE: "Designate another head office before deactivating this branch.",
  HEAD_OFFICE_DELETE: "Designate another head office before deleting this branch.",
  HEAD_OFFICE_REQUIRED: "Designate another head office before removing this one.",
  USERS_ASSIGNED_DEACTIVATE: "Reassign users before deactivating this branch.",
  USERS_ASSIGNED_DELETE: "Reassign users before deleting this branch.",
  LAST_BRANCH: "The organization must keep at least one branch.",
  EXPORT_TRUNCATED: "The export was limited to the first 5,000 matching rows.",
} as const;

/** Role-master rule copy. Kept here so the service and the UI stay in sync. */
export const ROLE_MESSAGES = {
  NAME_TAKEN: "Role name is already in use.",
  SLUG_TAKEN: "Role slug is already in use.",
  SLUG_INVALID: "Enter a slug using lowercase letters, numbers and underscores.",
  OWN_ROLE_DEACTIVATE: "You cannot deactivate the role you are signed in with.",
  OWN_ROLE_DELETE: "You cannot delete the role you are signed in with.",
  SYSTEM_ROLE_DELETE: "System roles cannot be deleted.",
  SUPER_ADMIN_DEACTIVATE: "The Super Admin role cannot be deactivated.",
  SUPER_ADMIN_DELETE: "The Super Admin role cannot be deleted.",
  USERS_ASSIGNED_DEACTIVATE: "Reassign users before deactivating this role.",
  USERS_ASSIGNED_DELETE: "Reassign users before deleting this role.",
} as const;

export const ROLE_PERMISSION_MESSAGES = {
  SUPER_ADMIN_LOCKED: "Super Admin bypasses the permission matrix. Its grants cannot be edited.",
  OWN_ROLE_EDIT: "You cannot remove permission-matrix access from the role you are signed in with.",
} as const;

/** User-master rule copy. Kept here so the service and the UI stay in sync. */
export const USER_MESSAGES = {
  OWN_USER_DEACTIVATE: "You cannot deactivate your own account.",
  OWN_USER_DELETE: "You cannot delete your own account.",
  OWN_USER_ROLE: "You cannot change the role you are signed in with.",
  LAST_SUPER_ADMIN: "The organization must keep at least one Super Admin.",
  SUPER_ADMIN_ASSIGN: "Only a Super Admin can assign the Super Admin role.",
  SUPER_ADMIN_EDIT: "Only a Super Admin can change a Super Admin account.",
  BRANCH_INACTIVE: "Assign an active branch.",
  ROLE_INACTIVE: "Assign an active role.",
  DEPARTMENT_INACTIVE: "Assign an active department, or leave it empty.",
  DESIGNATION_INACTIVE: "Assign an active designation, or leave it empty.",
  RESET_INACTIVE: "Activate the account before sending a password reset.",
  RESET_COOLDOWN: "A reset email was sent recently. Wait a minute before sending another.",
  RESET_EMAIL_FAILED: "The password reset email could not be sent. Try again later.",
  EXPORT_TRUNCATED: "The export was limited to the first 5,000 matching rows.",
} as const;

export const PROFILE_MESSAGES = {
  AVATAR_REQUIRED: "Choose an image file.",
  AVATAR_TYPE: "Use a JPG, PNG or WEBP image.",
  AVATAR_TOO_LARGE: "Image must be 2 MB or smaller.",
  AVATAR_EMPTY: "The selected file is empty.",
  AVATAR_INVALID: "That file is not a valid image.",
} as const;

export const SETTINGS_MESSAGES = {
  ORGANIZATION_MISSING: "Organisation settings could not be loaded.",
  CODE_TAKEN: "Company code is already in use.",
} as const;

export const DEPARTMENT_MESSAGES = {
  CODE_TAKEN: "Department code is already in use.",
  NAME_TAKEN: "Department name is already in use.",
  USERS_ASSIGNED_DEACTIVATE: "Reassign employees before deactivating this department.",
  USERS_ASSIGNED_DELETE: "Reassign employees before deleting this department.",
  BRANCH_INACTIVE: "Assign an active branch, or leave branch empty.",
} as const;

export const DESIGNATION_MESSAGES = {
  CODE_TAKEN: "Designation code is already in use.",
  NAME_TAKEN: "Designation name is already in use.",
  USERS_ASSIGNED_DEACTIVATE: "Reassign employees before deactivating this designation.",
  USERS_ASSIGNED_DELETE: "Reassign employees before deleting this designation.",
} as const;

export const ATTENDANCE_MESSAGES = {
  DUPLICATE_DAY: "Attendance for this employee on that date already exists.",
} as const;

export const LEAVE_MESSAGES = {
  DATE_ORDER: "The end date must be on or after the start date.",
} as const;

export const HOLIDAY_MESSAGES = {
  DATE_TAKEN: "A holiday is already recorded on that date.",
} as const;

export const PROJECT_MESSAGES = {
  CODE_TAKEN: "Project code is already in use.",
  DATE_ORDER: "The end date must be on or after the start date.",
  TASKS_ASSIGNED_DELETE: "Remove or reassign tasks before deleting this project.",
} as const;

export const TASK_MESSAGES = {
  WORKLOGS_ASSIGNED_DELETE: "Remove worklogs before deleting this task.",
} as const;

export const WORKLOG_MESSAGES = {
  HOURS_RANGE: "Enter hours between 0.25 and 24.",
} as const;
