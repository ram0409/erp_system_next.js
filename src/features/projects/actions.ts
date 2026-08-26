"use server";

import { revalidatePath } from "next/cache";

import { SUCCESS_MESSAGES } from "@/constants/messages";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { defineAction } from "@/lib/action";
import { getUserAgent } from "@/lib/request";
import * as projectService from "@/services/project-service";
import {
  createProjectSchema,
  projectPublicIdSchema,
  updateProjectSchema,
} from "@/validations/project";

async function auditMeta() {
  return { userAgent: await getUserAgent() };
}

function revalidateProjects(): void {
  revalidatePath(ROUTES.PROJECTS);
  revalidatePath(ROUTES.TASKS);
}

export const getProjectAction = defineAction({
  name: "projects.get",
  permission: PERMISSIONS.PROJECTS.VIEW,
  schema: projectPublicIdSchema,
  successMessage: "OK",
  handler: async (input) => projectService.getProject(input.publicId),
});

export const createProjectAction = defineAction({
  name: "projects.create",
  permission: PERMISSIONS.PROJECTS.CREATE,
  schema: createProjectSchema,
  successMessage: SUCCESS_MESSAGES.CREATED,
  handler: async (input, actor) => {
    const data = await projectService.createProject(input, actor, await auditMeta());
    revalidateProjects();
    return data;
  },
});

export const updateProjectAction = defineAction({
  name: "projects.update",
  permission: PERMISSIONS.PROJECTS.EDIT,
  schema: updateProjectSchema,
  successMessage: SUCCESS_MESSAGES.UPDATED,
  handler: async (input, actor) => {
    const data = await projectService.updateProject(input, actor, await auditMeta());
    revalidateProjects();
    return data;
  },
});

export const deleteProjectAction = defineAction({
  name: "projects.delete",
  permission: PERMISSIONS.PROJECTS.DELETE,
  schema: projectPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.DELETED,
  handler: async (input, actor) => {
    await projectService.deleteProject(input.publicId, actor, await auditMeta());
    revalidateProjects();
    return null;
  },
});
