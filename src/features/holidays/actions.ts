"use server";

import { revalidatePath } from "next/cache";

import { SUCCESS_MESSAGES } from "@/constants/messages";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { RECORD_STATUS } from "@/constants/status";
import { defineAction } from "@/lib/action";
import { getUserAgent } from "@/lib/request";
import * as holidayService from "@/services/holiday-service";
import {
  createHolidaySchema,
  holidayPublicIdSchema,
  updateHolidaySchema,
} from "@/validations/holiday";

async function auditMeta() {
  return { userAgent: await getUserAgent() };
}

function revalidateHolidays(): void {
  revalidatePath(ROUTES.HOLIDAYS);
}

export const getHolidayAction = defineAction({
  name: "holidays.get",
  permission: PERMISSIONS.HOLIDAYS.VIEW,
  schema: holidayPublicIdSchema,
  successMessage: "OK",
  handler: async (input) => holidayService.getHoliday(input.publicId),
});

export const createHolidayAction = defineAction({
  name: "holidays.create",
  permission: PERMISSIONS.HOLIDAYS.CREATE,
  schema: createHolidaySchema,
  successMessage: SUCCESS_MESSAGES.CREATED,
  handler: async (input, actor) => {
    const data = await holidayService.createHoliday(input, actor, await auditMeta());
    revalidateHolidays();
    return data;
  },
});

export const updateHolidayAction = defineAction({
  name: "holidays.update",
  permission: PERMISSIONS.HOLIDAYS.EDIT,
  schema: updateHolidaySchema,
  successMessage: SUCCESS_MESSAGES.UPDATED,
  handler: async (input, actor) => {
    const data = await holidayService.updateHoliday(input, actor, await auditMeta());
    revalidateHolidays();
    return data;
  },
});

export const activateHolidayAction = defineAction({
  name: "holidays.activate",
  permission: PERMISSIONS.HOLIDAYS.EDIT,
  schema: holidayPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.ACTIVATED,
  handler: async (input, actor) => {
    const data = await holidayService.setHolidayStatus(
      input.publicId,
      RECORD_STATUS.ACTIVE,
      actor,
      await auditMeta(),
    );
    revalidateHolidays();
    return data;
  },
});

export const deactivateHolidayAction = defineAction({
  name: "holidays.deactivate",
  permission: PERMISSIONS.HOLIDAYS.EDIT,
  schema: holidayPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.DEACTIVATED,
  handler: async (input, actor) => {
    const data = await holidayService.setHolidayStatus(
      input.publicId,
      RECORD_STATUS.INACTIVE,
      actor,
      await auditMeta(),
    );
    revalidateHolidays();
    return data;
  },
});

export const deleteHolidayAction = defineAction({
  name: "holidays.delete",
  permission: PERMISSIONS.HOLIDAYS.DELETE,
  schema: holidayPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.DELETED,
  handler: async (input, actor) => {
    await holidayService.deleteHoliday(input.publicId, actor, await auditMeta());
    revalidateHolidays();
    return null;
  },
});
