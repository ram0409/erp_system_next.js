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
import {
  HOLIDAY_TYPE_LABELS,
  HOLIDAY_TYPE_OPTIONS,
  RECORD_STATUS,
  RECORD_STATUS_OPTIONS,
} from "@/constants/status";
import {
  activateHolidayAction,
  deactivateHolidayAction,
  deleteHolidayAction,
  getHolidayAction,
} from "@/features/holidays/actions";
import {
  HolidayFormDialog,
  type HolidayFormMode,
} from "@/features/holidays/components/holiday-form-dialog";
import { useTableParams } from "@/hooks/use-table-params";
import { cn } from "@/lib/utils";
import type { HolidayDetail, HolidayListItem } from "@/types/hr";
import type { PaginationMeta } from "@/types/pagination";
import { formatDate } from "@/utils/format";

interface HolidaysWorkspaceProps {
  readonly items: readonly HolidayListItem[];
  readonly meta: PaginationMeta;
  readonly isFiltered: boolean;
}

type PendingConfirm =
  | { readonly kind: "activate"; readonly row: HolidayListItem }
  | { readonly kind: "deactivate"; readonly row: HolidayListItem }
  | { readonly kind: "delete"; readonly row: HolidayListItem };

export function HolidaysWorkspace({ items, meta, isFiltered }: HolidaysWorkspaceProps) {
  const router = useRouter();
  const { isPending } = useTableParams();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<HolidayFormMode>("create");
  const [detail, setDetail] = useState<HolidayDetail | null>(null);
  const [detailPending, setDetailPending] = useState(false);
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  async function openForm(mode: HolidayFormMode, publicId?: string) {
    setFormMode(mode);
    setDetail(null);
    setFormOpen(true);
    if (!publicId) return;
    setDetailPending(true);
    const result = await getHolidayAction({ publicId });
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
        ? await activateHolidayAction({ publicId: row.publicId })
        : kind === "deactivate"
          ? await deactivateHolidayAction({ publicId: row.publicId })
          : await deleteHolidayAction({ publicId: row.publicId });
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    router.refresh();
  }

  const columns = useMemo<DataTableColumn<HolidayListItem>[]>(
    () => [
      {
        id: "holidayDate",
        header: <SortableColumnHeader field="holidayDate" label="Date" />,
        cell: (row) => formatDate(row.holidayDate),
      },
      {
        id: "name",
        header: <SortableColumnHeader field="name" label="Name" />,
        cell: (row) => <span className="font-medium">{row.name}</span>,
      },
      {
        id: "type",
        header: <SortableColumnHeader field="type" label="Type" />,
        cell: (row) => HOLIDAY_TYPE_LABELS[row.type],
      },
      {
        id: "status",
        header: <SortableColumnHeader field="status" label="Status" />,
        cell: (row) => <StatusBadge status={row.status} />,
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
            <Can permission={PERMISSIONS.HOLIDAYS.EDIT}>
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
            <Can permission={PERMISSIONS.HOLIDAYS.DELETE}>
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
          description: "This holiday will be removed from the calendar.",
          confirmLabel: "Delete holiday",
          variant: "destructive" as const,
        }
      : pending?.kind === "deactivate"
        ? {
            title: `Deactivate ${pending.row.name}?`,
            description: "This holiday will no longer be treated as an observed day.",
            confirmLabel: "Deactivate",
            variant: "primary" as const,
          }
        : pending
          ? {
              title: `Activate ${pending.row.name}?`,
              description: "This holiday will be observed again.",
              confirmLabel: "Activate",
              variant: "primary" as const,
            }
          : null;

  return (
    <>
      <Card className={cn(isPending && "opacity-70")}>
        <FilterBar hasActiveFilters={isFiltered}>
          <SearchInput placeholder="Search name or notes" label="Search holidays" />
          <FilterSelect
            paramKey={TABLE_QUERY_KEYS.STATUS}
            label="Status"
            options={RECORD_STATUS_OPTIONS}
            allLabel="All statuses"
          />
          <FilterSelect
            paramKey={TABLE_QUERY_KEYS.TYPE}
            label="Type"
            options={HOLIDAY_TYPE_OPTIONS}
            allLabel="All types"
          />
          <div className={cn("flex flex-wrap items-center gap-2", !isFiltered && "sm:ml-auto")}>
            <Can permission={PERMISSIONS.HOLIDAYS.CREATE}>
              <Button type="button" size="sm" onClick={() => void openForm("create")}>
                <PlusIcon />
                Add holiday
              </Button>
            </Can>
          </div>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={items}
          getRowId={(row) => row.publicId}
          isFiltered={isFiltered}
          caption="Holidays"
        />
        {items.length > 0 || meta.totalItems > 0 ? <Pagination meta={meta} /> : null}
      </Card>

      <HolidayFormDialog
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
