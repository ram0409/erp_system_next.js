"use server";

import { revalidatePath } from "next/cache";

import { SUCCESS_MESSAGES } from "@/constants/messages";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { defineAction } from "@/lib/action";
import { getUserAgent } from "@/lib/request";
import * as attendanceService from "@/services/attendance-service";
import {
  attendancePublicIdSchema,
  createAttendanceSchema,
  updateAttendanceSchema,
} from "@/validations/attendance";

async function auditMeta() {
  return { userAgent: await getUserAgent() };
}

function revalidateAttendance(): void {
  revalidatePath(ROUTES.ATTENDANCE);
}

export const getAttendanceAction = defineAction({
  name: "attendance.get",
  permission: PERMISSIONS.ATTENDANCE.VIEW,
  schema: attendancePublicIdSchema,
  successMessage: "OK",
  handler: async (input) => attendanceService.getAttendance(input.publicId),
});

export const createAttendanceAction = defineAction({
  name: "attendance.create",
  permission: PERMISSIONS.ATTENDANCE.CREATE,
  schema: createAttendanceSchema,
  successMessage: SUCCESS_MESSAGES.CREATED,
  handler: async (input, actor) => {
    const data = await attendanceService.createAttendance(input, actor, await auditMeta());
    revalidateAttendance();
    return data;
  },
});

export const updateAttendanceAction = defineAction({
  name: "attendance.update",
  permission: PERMISSIONS.ATTENDANCE.EDIT,
  schema: updateAttendanceSchema,
  successMessage: SUCCESS_MESSAGES.UPDATED,
  handler: async (input, actor) => {
    const data = await attendanceService.updateAttendance(input, actor, await auditMeta());
    revalidateAttendance();
    return data;
  },
});

export const deleteAttendanceAction = defineAction({
  name: "attendance.delete",
  permission: PERMISSIONS.ATTENDANCE.DELETE,
  schema: attendancePublicIdSchema,
  successMessage: SUCCESS_MESSAGES.DELETED,
  handler: async (input, actor) => {
    await attendanceService.deleteAttendance(input.publicId, actor, await auditMeta());
    revalidateAttendance();
    return null;
  },
});
