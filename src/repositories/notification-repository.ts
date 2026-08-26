import "server-only";

import { NOTIFICATION_FEED_LIMIT, type NotificationType } from "@/constants/notifications";
import { prisma } from "@/lib/prisma";
import { withPrismaErrors } from "./prisma-errors";
import type { Prisma } from "@generated/prisma/client";

const LIST_SELECT = {
  publicId: true,
  type: true,
  title: true,
  body: true,
  href: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

export type NotificationRow = Prisma.NotificationGetPayload<{ select: typeof LIST_SELECT }>;

export interface CreateNotificationInput {
  readonly recipientId: number;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly href?: string | null;
  readonly entityType?: string | null;
  readonly entityPublicId?: string | null;
}

export function createMany(inputs: readonly CreateNotificationInput[]): Promise<number> {
  if (inputs.length === 0) {
    return Promise.resolve(0);
  }

  return withPrismaErrors("notification.createMany", async () => {
    const result = await prisma.notification.createMany({
      data: inputs.map((input) => ({
        recipientId: input.recipientId,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href ?? null,
        entityType: input.entityType ?? null,
        entityPublicId: input.entityPublicId ?? null,
      })),
    });
    return result.count;
  });
}

export function listForRecipient(recipientId: number): Promise<NotificationRow[]> {
  return withPrismaErrors("notification.listForRecipient", () =>
    prisma.notification.findMany({
      where: { recipientId },
      select: LIST_SELECT,
      orderBy: { createdAt: "desc" },
      take: NOTIFICATION_FEED_LIMIT,
    }),
  );
}

export function countUnread(recipientId: number): Promise<number> {
  return withPrismaErrors("notification.countUnread", () =>
    prisma.notification.count({
      where: { recipientId, readAt: null },
    }),
  );
}

export function markRead(recipientId: number, publicId: string): Promise<boolean> {
  return withPrismaErrors("notification.markRead", async () => {
    const result = await prisma.notification.updateMany({
      where: { recipientId, publicId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count > 0;
  });
}

export function markAllRead(recipientId: number): Promise<number> {
  return withPrismaErrors("notification.markAllRead", async () => {
    const result = await prisma.notification.updateMany({
      where: { recipientId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  });
}
