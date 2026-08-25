import { AUDIT_ACTIONS, type AuditAction } from "@/constants/status";

/** How many audit rows the dashboard feed loads. */
export const DASHBOARD_ACTIVITY_LIMIT = 12;

/** Maximum slices in a distribution chart before the remainder is folded into Other. */
export const DASHBOARD_CHART_LIMIT = 8;

/**
 * Sign-in noise would drown the feed. The dashboard is for administrative work:
 * masters, assignments and password administration.
 */
export const DASHBOARD_FEED_EXCLUDED_ACTIONS: readonly AuditAction[] = [
  AUDIT_ACTIONS.LOGIN,
  AUDIT_ACTIONS.LOGOUT,
  AUDIT_ACTIONS.LOGIN_FAILED,
];
