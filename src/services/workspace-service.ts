import "server-only";

import { ERROR_MESSAGES } from "@/constants/messages";
import { RECORD_STATUS } from "@/constants/status";
import { ValidationError } from "@/lib/errors";
import { setWorkspaceCookie } from "@/lib/workspace-cookie";
import { getWorkspaceScope } from "@/lib/workspace-scope";
import * as branchRepository from "@/repositories/branch-repository";
import * as entityRepository from "@/repositories/entity-repository";
import type { ActorContext } from "@/types/session";
import type {
  WorkspaceBranchOption,
  WorkspaceEntityOption,
  WorkspaceSelection,
  WorkspaceSwitcher,
} from "@/types/workspace";
import type { SetWorkspaceInput } from "@/validations/workspace";

function assignedSelection(actor: ActorContext): WorkspaceSelection {
  return {
    entityPublicId: actor.user.branch.entity.publicId,
    branchPublicId: actor.user.branch.publicId,
  };
}

function mergeCurrent(
  actor: ActorContext,
  entities: WorkspaceEntityOption[],
  branches: WorkspaceBranchOption[],
): { entities: WorkspaceEntityOption[]; branches: WorkspaceBranchOption[] } {
  const assigned = actor.user.branch;
  const nextEntities = [...entities];
  if (!nextEntities.some((entity) => entity.publicId === assigned.entity.publicId)) {
    nextEntities.unshift({
      publicId: assigned.entity.publicId,
      code: assigned.entity.code,
      name: assigned.entity.name,
    });
  }

  const nextBranches = [...branches];
  if (!nextBranches.some((branch) => branch.publicId === assigned.publicId)) {
    nextBranches.unshift({
      publicId: assigned.publicId,
      code: assigned.code,
      name: assigned.name,
      entityPublicId: assigned.entity.publicId,
    });
  }

  return { entities: nextEntities, branches: nextBranches };
}

export async function getWorkspaceSwitcher(actor: ActorContext): Promise<WorkspaceSwitcher> {
  const [entities, branches, scope] = await Promise.all([
    entityRepository.listOptions(true),
    branchRepository.listOptions(),
    getWorkspaceScope(),
  ]);
  const merged = mergeCurrent(actor, entities, branches);

  return {
    entities: merged.entities,
    branches: merged.branches,
    selected: scope
      ? { entityPublicId: scope.entityPublicId, branchPublicId: scope.branchPublicId }
      : assignedSelection(actor),
  };
}

export async function setWorkspace(input: SetWorkspaceInput): Promise<WorkspaceSelection> {
  const [entity, branch] = await Promise.all([
    entityRepository.findByPublicId(input.entityPublicId),
    branchRepository.findByPublicId(input.branchPublicId),
  ]);

  if (!entity || entity.status !== RECORD_STATUS.ACTIVE) {
    throw new ValidationError(ERROR_MESSAGES.NOT_FOUND, {
      fieldErrors: [{ field: "entityPublicId", message: ERROR_MESSAGES.NOT_FOUND }],
    });
  }

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

  if (branch.entity.publicId !== entity.publicId) {
    throw new ValidationError("Select a branch that belongs to this entity.", {
      fieldErrors: [
        { field: "branchPublicId", message: "Select a branch that belongs to this entity." },
      ],
    });
  }

  const selected = {
    entityPublicId: entity.publicId,
    branchPublicId: branch.publicId,
  };

  await setWorkspaceCookie(selected);
  return selected;
}
