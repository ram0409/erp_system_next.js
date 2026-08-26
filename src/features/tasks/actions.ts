"use server";

import { revalidatePath } from "next/cache";

import { SUCCESS_MESSAGES } from "@/constants/messages";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { defineAction } from "@/lib/action";
import { getUserAgent } from "@/lib/request";
import * as taskService from "@/services/task-service";
import { createTaskSchema, taskPublicIdSchema, updateTaskSchema } from "@/validations/task";

async function auditMeta() {
  return { userAgent: await getUserAgent() };
}

function revalidateTasks(): void {
  revalidatePath(ROUTES.TASKS);
  revalidatePath(ROUTES.PROJECTS);
  revalidatePath(ROUTES.WORKLOGS);
}

export const getTaskAction = defineAction({
  name: "tasks.get",
  permission: PERMISSIONS.TASKS.VIEW,
  schema: taskPublicIdSchema,
  successMessage: "OK",
  handler: async (input) => taskService.getTask(input.publicId),
});

export const createTaskAction = defineAction({
  name: "tasks.create",
  permission: PERMISSIONS.TASKS.CREATE,
  schema: createTaskSchema,
  successMessage: SUCCESS_MESSAGES.CREATED,
  handler: async (input, actor) => {
    const data = await taskService.createTask(input, actor, await auditMeta());
    revalidateTasks();
    return data;
  },
});

export const updateTaskAction = defineAction({
  name: "tasks.update",
  permission: PERMISSIONS.TASKS.EDIT,
  schema: updateTaskSchema,
  successMessage: SUCCESS_MESSAGES.UPDATED,
  handler: async (input, actor) => {
    const data = await taskService.updateTask(input, actor, await auditMeta());
    revalidateTasks();
    return data;
  },
});

export const deleteTaskAction = defineAction({
  name: "tasks.delete",
  permission: PERMISSIONS.TASKS.DELETE,
  schema: taskPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.DELETED,
  handler: async (input, actor) => {
    await taskService.deleteTask(input.publicId, actor, await auditMeta());
    revalidateTasks();
    return null;
  },
});
