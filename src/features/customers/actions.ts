"use server";

import { revalidatePath } from "next/cache";

import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { SUCCESS_MESSAGES } from "@/constants/messages";
import { RECORD_STATUS } from "@/constants/status";
import { defineAction } from "@/lib/action";
import { getUserAgent } from "@/lib/request";
import * as customerService from "@/services/customer-service";
import {
  createCustomerSchema,
  customerPublicIdSchema,
  exportCustomersSchema,
  updateCustomerSchema,
} from "@/validations/customer";

async function auditMeta() {
  return { userAgent: await getUserAgent() };
}

function revalidateCustomers(): void {
  revalidatePath(ROUTES.CUSTOMERS);
  revalidatePath(ROUTES.DASHBOARD);
}

export const getCustomerAction = defineAction({
  name: "customers.get",
  permission: PERMISSIONS.CUSTOMERS.VIEW,
  schema: customerPublicIdSchema,
  successMessage: "OK",
  handler: async (input) => customerService.getCustomer(input.publicId),
});

export const createCustomerAction = defineAction({
  name: "customers.create",
  permission: PERMISSIONS.CUSTOMERS.CREATE,
  schema: createCustomerSchema,
  successMessage: SUCCESS_MESSAGES.CREATED,
  handler: async (input, actor) => {
    const data = await customerService.createCustomer(input, actor, await auditMeta());
    revalidateCustomers();
    return data;
  },
});

export const updateCustomerAction = defineAction({
  name: "customers.update",
  permission: PERMISSIONS.CUSTOMERS.EDIT,
  schema: updateCustomerSchema,
  successMessage: SUCCESS_MESSAGES.UPDATED,
  handler: async (input, actor) => {
    const data = await customerService.updateCustomer(input, actor, await auditMeta());
    revalidateCustomers();
    return data;
  },
});

export const activateCustomerAction = defineAction({
  name: "customers.activate",
  permission: PERMISSIONS.CUSTOMERS.EDIT,
  schema: customerPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.ACTIVATED,
  handler: async (input, actor) => {
    const data = await customerService.setCustomerStatus(
      input.publicId,
      RECORD_STATUS.ACTIVE,
      actor,
      await auditMeta(),
    );
    revalidateCustomers();
    return data;
  },
});

export const deactivateCustomerAction = defineAction({
  name: "customers.deactivate",
  permission: PERMISSIONS.CUSTOMERS.EDIT,
  schema: customerPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.DEACTIVATED,
  handler: async (input, actor) => {
    const data = await customerService.setCustomerStatus(
      input.publicId,
      RECORD_STATUS.INACTIVE,
      actor,
      await auditMeta(),
    );
    revalidateCustomers();
    return data;
  },
});

export const deleteCustomerAction = defineAction({
  name: "customers.delete",
  permission: PERMISSIONS.CUSTOMERS.DELETE,
  schema: customerPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.DELETED,
  handler: async (input, actor) => {
    await customerService.deleteCustomer(input.publicId, actor, await auditMeta());
    revalidateCustomers();
    return null;
  },
});

export const exportCustomersAction = defineAction({
  name: "customers.export",
  permission: PERMISSIONS.CUSTOMERS.EXPORT,
  schema: exportCustomersSchema,
  successMessage: SUCCESS_MESSAGES.EXPORTED,
  handler: async (input) => customerService.exportCustomers(input),
});
