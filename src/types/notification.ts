import type { NotificationType } from "@/constants/notifications";

export interface NotificationItem {
  readonly publicId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly href: string | null;
  readonly readAt: string | null;
  readonly createdAt: string;
}

export interface NotificationFeed {
  readonly unreadCount: number;
  readonly items: readonly NotificationItem[];
}
