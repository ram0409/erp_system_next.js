"use server";

import { defineAuthenticatedAction } from "@/lib/action";
import * as notificationService from "@/services/notification-service";
import {
  emptyNotificationInputSchema,
  notificationPublicIdSchema,
} from "@/validations/notification";

export const listMyNotificationsAction = defineAuthenticatedAction({
  name: "notifications.list",
  schema: emptyNotificationInputSchema,
  successMessage: "OK",
  handler: async (_input, actor) => notificationService.listMyNotifications(actor.userId),
});

export const markNotificationReadAction = defineAuthenticatedAction({
  name: "notifications.markRead",
  schema: notificationPublicIdSchema,
  successMessage: "OK",
  handler: async (input, actor) =>
    notificationService.markNotificationRead(actor.userId, input.publicId),
});

export const markAllNotificationsReadAction = defineAuthenticatedAction({
  name: "notifications.markAllRead",
  schema: emptyNotificationInputSchema,
  successMessage: "OK",
  handler: async (_input, actor) => notificationService.markAllNotificationsRead(actor.userId),
});
