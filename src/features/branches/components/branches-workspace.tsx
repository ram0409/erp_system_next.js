"use client";

import { DownloadIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Can } from "@/components/shared/can";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { FilterBar, FilterSelect } from "@/components/tables/filter-bar";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Pagination } from "@/components/tables/pagination";
import { RowActions } from "@/components/tables/row-actions";
import { SearchInput } from "@/components/tables/search-input";
import { SortableColumnHeader } from "@/components/tables/sortable-column-header";
import { PERMISSIONS } from "@/constants/permissions";
import { BRANCH_MESSAGES } from "@/constants/messages";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import {
  BRANCH_TYPE_LABELS,
  BRANCH_TYPE_OPTIONS,
  RECORD_STATUS,
  RECORD_STATUS_OPTIONS,
} from "@/constants/status";
import {
  activateBranchAction,
  deactivateBranchAction,
  deleteBranchAction,
  exportBranchesAction,
  getBranchAction,
} from "@/features/branches/actions";
import { BranchFormDialog, type BranchFormMode } from "@/features/branches/components/branch-form-dialog";
import { useTableParams } from "@/hooks/use-table-params";
import { cn } from "@/lib/utils";
import type { BranchDetail, BranchListItem } from "@/types/branch";
import type { EntityOption } from "@/types/entity";
import type { PaginationMeta } from "@/types/pagination";
import { EMPTY_VALUE_PLACEHOLDER, formatDate } from "@/utils/format";

interface BranchesWorkspaceProps {
  readonly items: readonly BranchListItem[];
  readonly meta: PaginationMeta;
  readonly isFiltered: boolean;
  readonly actorBranchPublicId: string;
  readonly entities: readonly EntityOption[];
  readonly exportFilters: {
    readonly search?: string;
    readonly status?: BranchListItem["status"];
    readonly type?: BranchListItem["type"];
    readonly entityPublicId?: string;
  };
}

type PendingConfirm =
  | { readonly kind: "activate"; readonly row: BranchListItem }
  | { readonly kind: "deactivate"; readonly row: BranchListItem }
  | { readonly kind: "delete"; readonly row: BranchListItem };

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function BranchesWorkspace({
  items,
  meta,
  isFiltered,
  actorBranchPublicId,
  entities,
  exportFilters,
}: BranchesWorkspaceProps) {
  const router = useRouter();
  const { isPending } = useTableParams();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<BranchFormMode>("create");
  const [detail, setDetail] = useState<BranchDetail | null>(null);
  const [detailPending, setDetailPending] = useState(false);
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [isExporting, startExport] = useTransition();

  async function openForm(mode: BranchFormMode, publicId?: string) {
    setFormMode(mode);
    setDetail(null);
    setFormOpen(true);

    if (!publicId) {
      return;
    }

    setDetailPending(true);
    const result = await getBranchAction({ publicId });
    setDetailPending(false);

    if (!result.success) {
      toast.error(result.message);
      setFormOpen(false);
      return;
    }

    setDetail(result.data);
  }

  function handleFormSuccess(message: string) {
    toast.success(message);
    router.refresh();
  }

  async function runPendingConfirm() {
    if (!pending) {
      return;
    }

    const { kind, row } = pending;
    const result =
      kind === "activate"
        ? await activateBranchAction({ publicId: row.publicId })
        : kind === "deactivate"
          ? await deactivateBranchAction({ publicId: row.publicId })
          : await deleteBranchAction({ publicId: row.publicId });

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    router.refresh();
  }

  function handleExport() {
    startExport(async () => {
      const result = await exportBranchesAction({
        ...(exportFilters.search ? { search: exportFilters.search } : {}),
        ...(exportFilters.status ? { status: exportFilters.status } : {}),
        ...(exportFilters.type ? { type: exportFilters.type } : {}),
        ...(exportFilters.entityPublicId ? { entityPublicId: exportFilters.entityPublicId } : {}),
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      downloadCsv(result.data.filename, result.data.csv);
      if (result.data.truncated) {
        toast.warning(BRANCH_MESSAGES.EXPORT_TRUNCATED);
      } else {
        toast.success(result.message);
      }
    });
  }

  const columns = useMemo<DataTableColumn<BranchListItem>[]>(
    () => [
      {
        id: "code",
        header: <SortableColumnHeader field="code" label="Code" />,
        cell: (row) => (
          <span className="font-medium">
            {row.code}
            {row.isHeadOffice ? (
              <Badge variant="info" className="ml-2">
                HO
              </Badge>
            ) : null}
          </span>
        ),
      },
      {
        id: "name",
        header: <SortableColumnHeader field="name" label="Name" />,
        cell: (row) => row.name,
      },
      {
        id: "entity",
        header: "Entity",
        cell: (row) => row.entity.name,
        hideBelowMd: true,
      },
      {
        id: "type",
        header: <SortableColumnHeader field="type" label="Type" />,
        cell: (row) => BRANCH_TYPE_LABELS[row.type],
        hideBelowMd: true,
      },
      {
        id: "city",
        header: "City",
        cell: (row) => row.city ?? EMPTY_VALUE_PLACEHOLDER,
        hideBelowMd: true,
      },
      {
        id: "status",
        header: <SortableColumnHeader field="status" label="Status" />,
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        id: "users",
        header: "Users",
        cell: (row) => row.userCount,
        hideBelowMd: true,
        align: "right",
      },
      {
        id: "createdAt",
        header: <SortableColumnHeader field="createdAt" label="Created" />,
        cell: (row) => formatDate(row.createdAt),
        hideBelowMd: true,
      },
      {
        id: "actions",
        header: <span className="sr-only">Actions</span>,
        align: "right",
        cell: (row) => {
          const isOwn = row.publicId === actorBranchPublicId;
          const canLeave = !isOwn && !row.isHeadOffice;

          return (
            <RowActions label={`Actions for ${row.name}`}>
              <DropdownMenuItem onSelect={() => void openForm("view", row.publicId)}>
                View
              </DropdownMenuItem>
              <Can permission={PERMISSIONS.BRANCHES.EDIT}>
                <DropdownMenuItem onSelect={() => void openForm("edit", row.publicId)}>
                  Edit
                </DropdownMenuItem>
              </Can>
              <Can permission={PERMISSIONS.BRANCHES.EDIT}>
                {row.status === RECORD_STATUS.INACTIVE ? (
                  <DropdownMenuItem onSelect={() => setPending({ kind: "activate", row })}>
                    Activate
                  </DropdownMenuItem>
                ) : canLeave ? (
                  <DropdownMenuItem onSelect={() => setPending({ kind: "deactivate", row })}>
                    Deactivate
                  </DropdownMenuItem>
                ) : null}
              </Can>
              {canLeave ? (
                <Can permission={PERMISSIONS.BRANCHES.DELETE}>
                  <DropdownMenuSeparator />
                </Can>
              ) : null}
              {canLeave ? (
                <Can permission={PERMISSIONS.BRANCHES.DELETE}>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setPending({ kind: "delete", row })}
                  >
                    Delete
                  </DropdownMenuItem>
                </Can>
              ) : null}
            </RowActions>
          );
        },
      },
    ],
    [actorBranchPublicId],
  );

  const confirmCopy =
    pending?.kind === "delete"
      ? {
          title: `Delete ${pending.row.name}?`,
          description:
            "The branch will be removed from the network. Users must be reassigned first. This cannot be undone from this screen.",
          confirmLabel: "Delete branch",
          variant: "destructive" as const,
        }
      : pending?.kind === "deactivate"
        ? {
            title: `Deactivate ${pending.row.name}?`,
            description:
              "Users assigned to an inactive branch cannot sign in. Reassign them first if anyone still works here.",
            confirmLabel: "Deactivate",
            variant: "primary" as const,
          }
        : pending
          ? {
              title: `Activate ${pending.row.name}?`,
              description: "The branch will be available for assignment and sign-in again.",
              confirmLabel: "Activate",
              variant: "primary" as const,
            }
          : null;

  return (
    <>
      <Card className={cn(isPending && "opacity-70")}>
        <FilterBar hasActiveFilters={isFiltered}>
          <SearchInput placeholder="Search code, name, city or entity" label="Search branches" />
          <FilterSelect
            paramKey={TABLE_QUERY_KEYS.STATUS}
            label="Status"
            options={RECORD_STATUS_OPTIONS}
            allLabel="All statuses"
          />
          <FilterSelect
            paramKey={TABLE_QUERY_KEYS.TYPE}
            label="Type"
            options={BRANCH_TYPE_OPTIONS}
            allLabel="All types"
          />
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <Can permission={PERMISSIONS.BRANCHES.EXPORT}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
              >
                <DownloadIcon />
                Export
              </Button>
            </Can>
            <Can permission={PERMISSIONS.BRANCHES.CREATE}>
              <Button type="button" size="sm" onClick={() => void openForm("create")}>
                <PlusIcon />
                Add branch
              </Button>
            </Can>
          </div>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={items}
          getRowId={(row) => row.publicId}
          isFiltered={isFiltered}
          caption="Branches"
        />
        {items.length > 0 || meta.totalItems > 0 ? <Pagination meta={meta} /> : null}
      </Card>

      <BranchFormDialog
        open={formOpen}
        mode={formMode}
        detail={detail}
        entities={entities}
        isLoading={detailPending}
        onOpenChange={setFormOpen}
        onSuccess={handleFormSuccess}
      />

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPending(null);
          }
        }}
        title={confirmCopy?.title ?? ""}
        description={confirmCopy?.description ?? ""}
        confirmLabel={confirmCopy?.confirmLabel}
        variant={confirmCopy?.variant}
        onConfirm={runPendingConfirm}
      />
    </>
  );
}
