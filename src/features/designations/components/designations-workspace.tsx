"use client";

import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Can } from "@/components/shared/can";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { FilterBar, FilterSelect } from "@/components/tables/filter-bar";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Pagination } from "@/components/tables/pagination";
import { RowActions } from "@/components/tables/row-actions";
import { SearchInput } from "@/components/tables/search-input";
import { SortableColumnHeader } from "@/components/tables/sortable-column-header";
import { PERMISSIONS } from "@/constants/permissions";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { RECORD_STATUS, RECORD_STATUS_OPTIONS } from "@/constants/status";
import {
  activateDesignationAction,
  deactivateDesignationAction,
  deleteDesignationAction,
  getDesignationAction,
} from "@/features/designations/actions";
import {
  DesignationFormDialog,
  type DesignationFormMode,
} from "@/features/designations/components/designation-form-dialog";
import { useTableParams } from "@/hooks/use-table-params";
import { cn } from "@/lib/utils";
import type { DesignationDetail, DesignationListItem } from "@/types/org-master";
import type { PaginationMeta } from "@/types/pagination";
import { formatDate } from "@/utils/format";

interface DesignationsWorkspaceProps {
  readonly items: readonly DesignationListItem[];
  readonly meta: PaginationMeta;
  readonly isFiltered: boolean;
}

type PendingConfirm =
  | { readonly kind: "activate"; readonly row: DesignationListItem }
  | { readonly kind: "deactivate"; readonly row: DesignationListItem }
  | { readonly kind: "delete"; readonly row: DesignationListItem };

export function DesignationsWorkspace({ items, meta, isFiltered }: DesignationsWorkspaceProps) {
  const router = useRouter();
  const { isPending } = useTableParams();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<DesignationFormMode>("create");
  const [detail, setDetail] = useState<DesignationDetail | null>(null);
  const [detailPending, setDetailPending] = useState(false);
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  async function openForm(mode: DesignationFormMode, publicId?: string) {
    setFormMode(mode);
    setDetail(null);
    setFormOpen(true);
    if (!publicId) return;
    setDetailPending(true);
    const result = await getDesignationAction({ publicId });
    setDetailPending(false);
    if (!result.success) {
      toast.error(result.message);
      setFormOpen(false);
      return;
    }
    setDetail(result.data);
  }

  async function runPendingConfirm() {
    if (!pending) return;
    const { kind, row } = pending;
    const result =
      kind === "activate"
        ? await activateDesignationAction({ publicId: row.publicId })
        : kind === "deactivate"
          ? await deactivateDesignationAction({ publicId: row.publicId })
          : await deleteDesignationAction({ publicId: row.publicId });
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    router.refresh();
  }

  const columns = useMemo<DataTableColumn<DesignationListItem>[]>(
    () => [
      {
        id: "name",
        header: <SortableColumnHeader field="name" label="Name" />,
        cell: (row) => <span className="font-medium">{row.name}</span>,
      },
      {
        id: "code",
        header: <SortableColumnHeader field="code" label="Code" />,
        cell: (row) => <span className="text-muted-foreground font-mono text-xs">{row.code}</span>,
      },
      {
        id: "status",
        header: <SortableColumnHeader field="status" label="Status" />,
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        id: "users",
        header: "Employees",
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
        cell: (row) => (
          <RowActions label={`Actions for ${row.name}`}>
            <DropdownMenuItem onSelect={() => void openForm("view", row.publicId)}>
              View
            </DropdownMenuItem>
            <Can permission={PERMISSIONS.DESIGNATIONS.EDIT}>
              <DropdownMenuItem onSelect={() => void openForm("edit", row.publicId)}>
                Edit
              </DropdownMenuItem>
              {row.status === RECORD_STATUS.INACTIVE ? (
                <DropdownMenuItem onSelect={() => setPending({ kind: "activate", row })}>
                  Activate
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => setPending({ kind: "deactivate", row })}>
                  Deactivate
                </DropdownMenuItem>
              )}
            </Can>
            <Can permission={PERMISSIONS.DESIGNATIONS.DELETE}>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setPending({ kind: "delete", row })}
              >
                Delete
              </DropdownMenuItem>
            </Can>
          </RowActions>
        ),
      },
    ],
    [],
  );

  const confirmCopy =
    pending?.kind === "delete"
      ? {
          title: `Delete ${pending.row.name}?`,
          description: "This designation will be removed. Employees must be unassigned first.",
          confirmLabel: "Delete designation",
          variant: "destructive" as const,
        }
      : pending?.kind === "deactivate"
        ? {
            title: `Deactivate ${pending.row.name}?`,
            description: "Employees must be unassigned before this designation can be deactivated.",
            confirmLabel: "Deactivate",
            variant: "primary" as const,
          }
        : pending
          ? {
              title: `Activate ${pending.row.name}?`,
              description: "This designation can be assigned to employees again.",
              confirmLabel: "Activate",
              variant: "primary" as const,
            }
          : null;

  return (
    <>
      <Card className={cn(isPending && "opacity-70")}>
        <FilterBar hasActiveFilters={isFiltered}>
          <SearchInput placeholder="Search name or code" label="Search designations" />
          <FilterSelect
            paramKey={TABLE_QUERY_KEYS.STATUS}
            label="Status"
            options={RECORD_STATUS_OPTIONS}
            allLabel="All statuses"
          />
          <div className={cn("flex flex-wrap items-center gap-2", !isFiltered && "sm:ml-auto")}>
            <Can permission={PERMISSIONS.DESIGNATIONS.CREATE}>
              <Button type="button" size="sm" onClick={() => void openForm("create")}>
                <PlusIcon />
                Add designation
              </Button>
            </Can>
          </div>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={items}
          getRowId={(row) => row.publicId}
          isFiltered={isFiltered}
          caption="Designations"
        />
        {items.length > 0 || meta.totalItems > 0 ? <Pagination meta={meta} /> : null}
      </Card>

      <DesignationFormDialog
        open={formOpen}
        mode={formMode}
        detail={detail}
        isLoading={detailPending}
        onOpenChange={setFormOpen}
        onSuccess={(message) => {
          toast.success(message);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
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
