import "server-only";

import { ERROR_MESSAGES } from "@/constants/messages";
import { RECORD_STATUS } from "@/constants/status";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { setWorkspaceCookie } from "@/lib/workspace-cookie";
import { getWorkspaceScope } from "@/lib/workspace-scope";
import * as branchRepository from "@/repositories/branch-repository";
import type { ActorContext } from "@/types/session";
import type {
  WorkspaceBranchOption,
  WorkspaceSelection,
  WorkspaceSwitcher,
} from "@/types/workspace";
import type { SetWorkspaceInput } from "@/validations/workspace";

function assignedSelection(actor: ActorContext): WorkspaceSelection {
  return {
    branchPublicId: actor.user.branch.publicId,
  };
}

function assignedBranchOption(actor: ActorContext): WorkspaceBranchOption {
  return {
    publicId: actor.user.branch.publicId,
    code: actor.user.branch.code,
    name: actor.user.branch.name,
    logoUrl: null,
  };
}

function mergeCurrent(
  actor: ActorContext,
  branches: WorkspaceBranchOption[],
): WorkspaceBranchOption[] {
  const assigned = actor.user.branch;
  const nextBranches = [...branches];
  if (!nextBranches.some((branch) => branch.publicId === assigned.publicId)) {
    nextBranches.unshift(assignedBranchOption(actor));
  }

  return nextBranches;
}

export async function getWorkspaceSwitcher(actor: ActorContext): Promise<WorkspaceSwitcher> {
  // Non–Super Admin users only see (and work in) their assigned branch.
  if (!actor.user.role.isSuperAdmin) {
    return {
      branches: [assignedBranchOption(actor)],
      selected: assignedSelection(actor),
    };
  }

  const [rows, scope] = await Promise.all([
    branchRepository.listOptions(),
    getWorkspaceScope(),
  ]);
  const branches = mergeCurrent(
    actor,
    rows.map((row) => ({
      publicId: row.publicId,
      code: row.code,
      name: row.name,
      logoUrl: row.logoPath,
    })),
  );

  return {
    branches,
    selected: scope
      ? { branchPublicId: scope.branchPublicId }
      : assignedSelection(actor),
  };
}

export async function setWorkspace(
  input: SetWorkspaceInput,
  actor: ActorContext,
): Promise<WorkspaceSelection> {
  if (!actor.user.role.isSuperAdmin) {
    if (input.branchPublicId !== actor.user.branch.publicId) {
      throw new ForbiddenError("You can only work in your assigned branch.");
    }

    const selected = assignedSelection(actor);
    await setWorkspaceCookie(selected);
    return selected;
  }

  const branch = await branchRepository.findByPublicId(input.branchPublicId);

  if (!branch) {
    throw new ValidationError(ERROR_MESSAGES.NOT_FOUND, {
      fieldErrors: [{ field: "branchPublicId", message: ERROR_MESSAGES.NOT_FOUND }],
    });
  }

  if (branch.status !== RECORD_STATUS.ACTIVE) {
    throw new ValidationError("Assign an active branch.", {
      fieldErrors: [{ field: "branchPublicId", message: "Assign an active branch." }],
    });
  }

  const selected = { branchPublicId: branch.publicId };
  await setWorkspaceCookie(selected);
  return selected;
}
