import "server-only";

import { NOTIFICATION_TYPES } from "@/constants/notifications";
import { ROUTES } from "@/constants/routes";
import { LEAVE_STATUS, LEAVE_TYPE_LABELS, type LeaveStatus, type LeaveType } from "@/constants/status";
import { logger } from "@/lib/logger";
import * as notificationRepository from "@/repositories/notification-repository";
import * as userRepository from "@/repositories/user-repository";
import type { NotificationFeed, NotificationItem } from "@/types/notification";
import { formatDate, formatFullName } from "@/utils/format";

interface LeaveRequestedPayload {
  readonly publicId: string;
  readonly type: LeaveType;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly status: LeaveStatus;
  readonly user: {
    readonly firstName: string;
    readonly lastName: string;
  };
}

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

/**
 * Notify Super Admin and HR (leave editors) when an employee raises a pending
 * leave request. Failures are logged and never roll back the leave create.
 */
export async function notifyLeaveRequested(
  leave: LeaveRequestedPayload,
  actorUserId: number,
): Promise<void> {
  if (leave.status !== LEAVE_STATUS.PENDING) {
    return;
  }

  try {
    const recipientIds = await userRepository.findLeaveReviewerIds(actorUserId);
    if (recipientIds.length === 0) {
      return;
    }

    const employeeName = formatFullName(leave.user.firstName, leave.user.lastName);
    const typeLabel = LEAVE_TYPE_LABELS[leave.type];
    const range = `${formatDate(leave.startDate)} – ${formatDate(leave.endDate)}`;

    await notificationRepository.createMany(
      recipientIds.map((recipientId) => ({
        recipientId,
        type: NOTIFICATION_TYPES.LEAVE_REQUESTED,
        title: "New leave request",
        body: `${employeeName} requested ${typeLabel.toLowerCase()} leave for ${range}.`,
        href: ROUTES.LEAVE,
        entityType: "LeaveRequest",
        entityPublicId: leave.publicId,
      })),
    );
  } catch (error) {
    logger.error("Failed to notify leave reviewers", { error, leavePublicId: leave.publicId });
  }
}
