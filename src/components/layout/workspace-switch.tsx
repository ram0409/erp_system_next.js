"use client";

import { BuildingIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
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

  function apply(branchPublicId: string) {
    if (branchPublicId === workspace.selected.branchPublicId) {
      return;
    }

    startTransition(async () => {
      const result = await setWorkspaceAction({ branchPublicId });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <label className="sr-only" htmlFor="workspace-branch">
        Branch
      </label>
      <Select
        value={workspace.selected.branchPublicId}
        onValueChange={apply}
        disabled={isPending || workspace.branches.length === 0}
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
          {workspace.branches.map((branch) => (
            <SelectItem key={branch.publicId} value={branch.publicId}>
              <span className="flex min-w-0 items-center gap-2">
                {branch.logoUrl ? (
                  // User-uploaded files in /public/uploads; next/image is not used for local blobs.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={branch.logoUrl}
                    alt=""
                    className="size-4 shrink-0 rounded-sm object-cover"
                  />
                ) : null}
                <span className="truncate">{branch.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
