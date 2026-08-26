export interface WorkspaceEntityOption {
  readonly publicId: string;
  readonly code: string;
  readonly name: string;
}

export interface WorkspaceBranchOption {
  readonly publicId: string;
  readonly code: string;
  readonly name: string;
  readonly entityPublicId: string;
}

export interface WorkspaceSelection {
  readonly entityPublicId: string;
  readonly branchPublicId: string;
}

export interface WorkspaceSwitcher {
  readonly entities: readonly WorkspaceEntityOption[];
  readonly branches: readonly WorkspaceBranchOption[];
  readonly selected: WorkspaceSelection;
}

/** Resolved workspace used to scope listings. Internal ids stay server-side. */
export interface WorkspaceScope {
  readonly entityId: number;
  readonly branchId: number;
  readonly entityPublicId: string;
  readonly branchPublicId: string;
}
