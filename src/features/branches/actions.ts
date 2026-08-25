"use server";

import { revalidatePath } from "next/cache";

import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { SUCCESS_MESSAGES } from "@/constants/messages";
import { RECORD_STATUS } from "@/constants/status";
import { defineAction } from "@/lib/action";
import { getUserAgent } from "@/lib/request";
import * as branchService from "@/services/branch-service";
import {
  branchPublicIdSchema,
  createBranchSchema,
  exportBranchesSchema,
  updateBranchSchema,
} from "@/validations/branch";

async function auditMeta() {
  return { userAgent: await getUserAgent() };
}

function revalidateBranches(): void {
  revalidatePath(ROUTES.BRANCHES);
}

export const getBranchAction = defineAction({
  name: "branches.get",
  permission: PERMISSIONS.BRANCHES.VIEW,
  schema: branchPublicIdSchema,
  successMessage: "OK",
  handler: async (input) => branchService.getBranch(input.publicId),
});

export const createBranchAction = defineAction({
  name: "branches.create",
  permission: PERMISSIONS.BRANCHES.CREATE,
  schema: createBranchSchema,
  successMessage: SUCCESS_MESSAGES.CREATED,
  handler: async (input, actor) => {
    const data = await branchService.createBranch(input, actor, await auditMeta());
    revalidateBranches();
    return data;
  },
});

export const updateBranchAction = defineAction({
  name: "branches.update",
  permission: PERMISSIONS.BRANCHES.EDIT,
  schema: updateBranchSchema,
  successMessage: SUCCESS_MESSAGES.UPDATED,
  handler: async (input, actor) => {
    const data = await branchService.updateBranch(input, actor, await auditMeta());
    revalidateBranches();
    return data;
  },
});

export const activateBranchAction = defineAction({
  name: "branches.activate",
  permission: PERMISSIONS.BRANCHES.EDIT,
  schema: branchPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.ACTIVATED,
  handler: async (input, actor) => {
    const data = await branchService.setBranchStatus(
      input.publicId,
      RECORD_STATUS.ACTIVE,
      actor,
      await auditMeta(),
    );
    revalidateBranches();
    return data;
  },
});

export const deactivateBranchAction = defineAction({
  name: "branches.deactivate",
  permission: PERMISSIONS.BRANCHES.EDIT,
  schema: branchPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.DEACTIVATED,
  handler: async (input, actor) => {
    const data = await branchService.setBranchStatus(
      input.publicId,
      RECORD_STATUS.INACTIVE,
      actor,
      await auditMeta(),
    );
    revalidateBranches();
    return data;
  },
});

export const deleteBranchAction = defineAction({
  name: "branches.delete",
  permission: PERMISSIONS.BRANCHES.DELETE,
  schema: branchPublicIdSchema,
  successMessage: SUCCESS_MESSAGES.DELETED,
  handler: async (input, actor) => {
    await branchService.deleteBranch(input.publicId, actor, await auditMeta());
    revalidateBranches();
    return null;
  },
});

export const exportBranchesAction = defineAction({
  name: "branches.export",
  permission: PERMISSIONS.BRANCHES.EXPORT,
  schema: exportBranchesSchema,
  successMessage: SUCCESS_MESSAGES.EXPORTED,
  handler: async (input) => branchService.exportBranches(input),
});
