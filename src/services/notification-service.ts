import "server-only";

import * as notificationRepository from "@/repositories/notification-repository";
import type { NotificationFeed, NotificationItem } from "@/types/notification";

function toItem(row: {
  readonly publicId: string;
  readonly type: NotificationItem["type"];
  readonly title: string;
  readonly body: string;
  readonly href: string | null;
  readonly readAt: Date | null;
  readonly createdAt: Date;
}): NotificationItem {
  return {
    publicId: row.publicId,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listMyNotifications(recipientId: number): Promise<NotificationFeed> {
  const [items, unreadCount] = await Promise.all([
    notificationRepository.listForRecipient(recipientId),
    notificationRepository.countUnread(recipientId),
  ]);

  return { unreadCount, items: items.map(toItem) };
}

export async function markNotificationRead(
  recipientId: number,
  publicId: string,
): Promise<NotificationFeed> {
  await notificationRepository.markRead(recipientId, publicId);
  return listMyNotifications(recipientId);
}

export async function markAllNotificationsRead(recipientId: number): Promise<NotificationFeed> {
  await notificationRepository.markAllRead(recipientId);
  return listMyNotifications(recipientId);
}
