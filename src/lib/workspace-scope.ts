import "server-only";

import { cache } from "react";

import { RECORD_STATUS } from "@/constants/status";
import { getActorContext } from "@/lib/session";
import { readWorkspaceCookie } from "@/lib/workspace-cookie";
import * as branchRepository from "@/repositories/branch-repository";
import type { WorkspaceScope } from "@/types/workspace";

function homeScope(
  actor: NonNullable<Awaited<ReturnType<typeof getActorContext>>>,
): WorkspaceScope {
  return {
    entityId: actor.entityId,
    branchId: actor.branchId,
    entityPublicId: actor.user.branch.entity.publicId,
    branchPublicId: actor.user.branch.publicId,
  };
}

/**
 * Selected Entity + Branch for this request. Listings, counts and assignment
 * dropdowns read this so the header switcher actually changes what is shown.
 */
export const getWorkspaceScope = cache(async (): Promise<WorkspaceScope | null> => {
  const actor = await getActorContext();
  if (!actor) {
    return null;
  }

  const assigned = homeScope(actor);
  const cookie = await readWorkspaceCookie();
  if (!cookie || cookie.branchPublicId === assigned.branchPublicId) {
    return assigned;
  }

  const branch = await branchRepository.findByPublicId(cookie.branchPublicId);
  if (
    !branch ||
    branch.status !== RECORD_STATUS.ACTIVE ||
    branch.entity.publicId !== cookie.entityPublicId
  ) {
    return assigned;
  }

  return {
    entityId: branch.entityId,
    branchId: branch.id,
    entityPublicId: branch.entity.publicId,
    branchPublicId: branch.publicId,
  };
});
