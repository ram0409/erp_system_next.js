"use client";

import { BuildingIcon, LandmarkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setWorkspaceAction } from "@/features/workspace/actions";
import type { WorkspaceSwitcher } from "@/types/workspace";

interface WorkspaceSwitchProps {
  readonly workspace: WorkspaceSwitcher;
}

export function WorkspaceSwitch({ workspace }: WorkspaceSwitchProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const branchesForEntity = useMemo(
    () =>
      workspace.branches.filter((branch) => branch.entityPublicId === workspace.selected.entityPublicId),
    [workspace.branches, workspace.selected.entityPublicId],
  );

  function apply(entityPublicId: string, branchPublicId: string) {
    if (
      entityPublicId === workspace.selected.entityPublicId &&
      branchPublicId === workspace.selected.branchPublicId
    ) {
      return;
    }

    startTransition(async () => {
      const result = await setWorkspaceAction({ entityPublicId, branchPublicId });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      router.refresh();
    });
  }

  function handleEntityChange(entityPublicId: string) {
    const currentStillValid = workspace.branches.some(
      (branch) =>
        branch.publicId === workspace.selected.branchPublicId &&
        branch.entityPublicId === entityPublicId,
    );
    const nextBranch = currentStillValid
      ? workspace.selected.branchPublicId
      : (workspace.branches.find((branch) => branch.entityPublicId === entityPublicId)?.publicId ??
        workspace.selected.branchPublicId);
    apply(entityPublicId, nextBranch);
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <label className="sr-only" htmlFor="workspace-entity">
        Entity
      </label>
      <Select
        value={workspace.selected.entityPublicId}
        onValueChange={handleEntityChange}
        disabled={isPending || workspace.entities.length === 0}
      >
        <SelectTrigger
          id="workspace-entity"
          size="sm"
          className="bg-background h-8 w-[7.5rem] gap-1.5 sm:w-44"
          aria-label="Entity"
        >
          <LandmarkIcon className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
          <SelectValue placeholder="Entity" />
        </SelectTrigger>
        <SelectContent>
          {workspace.entities.map((entity) => (
            <SelectItem key={entity.publicId} value={entity.publicId}>
              {entity.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <label className="sr-only" htmlFor="workspace-branch">
        Branch
      </label>
      <Select
        value={workspace.selected.branchPublicId}
        onValueChange={(branchPublicId) =>
          apply(workspace.selected.entityPublicId, branchPublicId)
        }
        disabled={isPending || branchesForEntity.length === 0}
      >
        <SelectTrigger
          id="workspace-branch"
          size="sm"
          className="bg-background h-8 w-[7.5rem] gap-1.5 sm:w-44"
          aria-label="Branch"
        >
          <BuildingIcon className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
          <SelectValue placeholder="Branch" />
        </SelectTrigger>
        <SelectContent>
          {branchesForEntity.map((branch) => (
            <SelectItem key={branch.publicId} value={branch.publicId}>
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
