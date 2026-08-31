export interface WorkspaceBranchOption {
  readonly publicId: string;
  readonly code: string;
  readonly name: string;
  readonly logoUrl: string | null;
}

export interface WorkspaceSelection {
  readonly branchPublicId: string;
}

export interface WorkspaceSwitcher {
  readonly branches: readonly WorkspaceBranchOption[];
  readonly selected: WorkspaceSelection;
}

/** Resolved workspace used to scope listings. Internal ids stay server-side. */
export interface WorkspaceScope {
  readonly branchId: number;
  readonly branchPublicId: string;
}
