"use server";

import { revalidatePath } from "next/cache";

import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { SUCCESS_MESSAGES } from "@/constants/messages";
import { RECORD_STATUS } from "@/constants/status";
import { defineAction } from "@/lib/action";
import { getUserAgent } from "@/lib/request";
import * as departmentService from "@/services/department-service";
import {
  createDepartmentSchema,
  departmentPublicIdSchema,
  updateDepartmentSchema,
} from "@/validations/org-master";

async function auditMeta() {
  return { userAgent: await getUserAgent() };
}

function revalidateDepartments(): void {
  revalidatePath(ROUTES.DEPARTMENTS);
  revalidatePath(ROUTES.USERS);
  revalidatePath(ROUTES.EMPLOYEES);
}

export const getDepartmentAction = defineAction({
  name: "departments.get",
  permission: PERMISSIONS.DEPARTMENTS.VIEW,
  schema: departmentPublicIdSchema,
  successMessage: "OK",
  handler: async (input) => departmentService.getDepartment(input.publicId),
});

export const createDepartmentAction = defineAction({
  name: "departments.create",
  permission: PERMISSIONS.DEPARTMENTS.CREATE,
  schema: createDepartmentSchema,
  successMessage: SUCCESS_MESSAGES.CREATED,
  handler: async (input, actor) => {
    const data = await departmentService.createDepartment(input, actor, await auditMeta());
    revalidateDepartments();
    return data;
  },
});

export const updateDepartmentAction = defineAction({
  name: "departments.update",
  permission: PERMISSIONS.DEPARTMENTS.EDIT,
  schema: updateDepartmentSchema,
  successMessage: SUCCESS_MESSAGES.UPDATED,
  handler: async (input, actor) => {
    const data = await departmentService.updateDepartment(input, actor, await auditMeta());
    revalidateDepartments();
    return data;
  },
});

export const activateDepartmentAction = defineAction({
  name: "departments.activate",
  permission: PERMISSIONS.DEPARTMENTS.EDIT,
  schema: departmentPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.ACTIVATED,
  handler: async (input, actor) => {
    const data = await departmentService.setDepartmentStatus(
      input.publicId,
      RECORD_STATUS.ACTIVE,
      actor,
      await auditMeta(),
    );
    revalidateDepartments();
    return data;
  },
});

export const deactivateDepartmentAction = defineAction({
  name: "departments.deactivate",
  permission: PERMISSIONS.DEPARTMENTS.EDIT,
  schema: departmentPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.DEACTIVATED,
  handler: async (input, actor) => {
    const data = await departmentService.setDepartmentStatus(
      input.publicId,
      RECORD_STATUS.INACTIVE,
      actor,
      await auditMeta(),
    );
    revalidateDepartments();
    return data;
  },
});

export const deleteDepartmentAction = defineAction({
  name: "departments.delete",
  permission: PERMISSIONS.DEPARTMENTS.DELETE,
  schema: departmentPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.DELETED,
  handler: async (input, actor) => {
    await departmentService.deleteDepartment(input.publicId, actor, await auditMeta());
    revalidateDepartments();
    return null;
  },
});
