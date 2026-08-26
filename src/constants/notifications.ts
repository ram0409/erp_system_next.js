export const NOTIFICATION_TYPES = {
  LEAVE_REQUESTED: "LEAVE_REQUESTED",
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export const NOTIFICATION_FEED_LIMIT = 20;
export const NOTIFICATION_POLL_MS = 45_000;
