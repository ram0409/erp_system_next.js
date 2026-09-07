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
} from "@/components/ui/select";
import { setWorkspaceAction } from "@/features/workspace/actions";
import { cn } from "@/lib/utils";
import type { WorkspaceSwitcher } from "@/types/workspace";

interface WorkspaceSwitchProps {
  readonly workspace: WorkspaceSwitcher;
}

const branchChipClassName =
  "workspace-branch-chip flex h-9 max-w-[14rem] items-center gap-2 rounded-xl px-2.5 text-sm sm:max-w-56";

function BranchMark({ logoUrl }: { readonly logoUrl?: string | null }) {
  if (logoUrl) {
    return (
      // User-uploaded files in /public/uploads; next/image is not used for local blobs.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        className="size-5 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span className="workspace-branch-mark size-5 shrink-0" aria-hidden="true">
      <BuildingIcon className="text-primary-foreground size-3" strokeWidth={2.25} />
    </span>
  );
}

export function WorkspaceSwitch({ workspace }: WorkspaceSwitchProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const selected =
    workspace.branches.find((branch) => branch.publicId === workspace.selected.branchPublicId) ??
    workspace.branches[0];
  const canSwitch = workspace.branches.length > 1;

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

  if (!canSwitch) {
    return (
      <div
        className={branchChipClassName}
        title={selected?.name}
        aria-label={`Branch ${selected?.name ?? ""}`}
      >
        <BranchMark logoUrl={selected?.logoUrl} />
        <span className="min-w-0 truncate font-medium tracking-tight">
          {selected?.name ?? "Branch"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center">
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
          className={cn(
            branchChipClassName,
            "w-[10rem] rounded-xl border-primary/35 bg-transparent shadow-none sm:w-56",
            "hover:border-primary/45 hover:bg-transparent",
            "focus-visible:border-primary/50 focus-visible:ring-primary/25",
            "data-[state=open]:border-primary/50",
            "[&_.workspace-branch-mark_svg]:text-primary-foreground",
            "[&_[data-slot=select-icon]_svg]:text-primary/80 [&_svg:last-child]:text-primary/80",
          )}
          aria-label="Branch"
        >
          <BranchMark logoUrl={selected?.logoUrl} />
          <span className="min-w-0 flex-1 truncate text-left font-medium tracking-tight">
            {selected?.name ?? "Branch"}
          </span>
        </SelectTrigger>
        <SelectContent align="end" className="min-w-[13rem]">
          {workspace.branches.map((branch) => (
            <SelectItem key={branch.publicId} value={branch.publicId} textValue={branch.name}>
              <span className="flex min-w-0 items-center gap-2">
                <BranchMark logoUrl={branch.logoUrl} />
                <span className="truncate">{branch.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
