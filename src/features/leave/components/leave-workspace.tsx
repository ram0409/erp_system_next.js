"use client";

import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Can } from "@/components/shared/can";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
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
  LEAVE_STATUS,
  LEAVE_STATUS_LABELS,
  LEAVE_STATUS_OPTIONS,
  LEAVE_TYPE_LABELS,
  LEAVE_TYPE_OPTIONS,
  type LeaveStatus,
} from "@/constants/status";
import { deleteLeaveAction, getLeaveAction } from "@/features/leave/actions";
import { LeaveFormDialog, type LeaveFormMode } from "@/features/leave/components/leave-form-dialog";
import { useTableParams } from "@/hooks/use-table-params";
import { cn } from "@/lib/utils";
import type { LeaveDetail, LeaveListItem } from "@/types/hr";
import type { PaginationMeta } from "@/types/pagination";
import type { EmployeeOption } from "@/types/user";
import { formatDate, formatFullName } from "@/utils/format";

interface LeaveWorkspaceProps {
  readonly items: readonly LeaveListItem[];
  readonly meta: PaginationMeta;
  readonly isFiltered: boolean;
  readonly employees: readonly EmployeeOption[];
}

function statusVariant(status: LeaveStatus) {
  switch (status) {
    case LEAVE_STATUS.APPROVED:
      return "success" as const;
    case LEAVE_STATUS.REJECTED:
      return "destructive" as const;
    case LEAVE_STATUS.PENDING:
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

export function LeaveWorkspace({ items, meta, isFiltered, employees }: LeaveWorkspaceProps) {
  const router = useRouter();
  const { isPending } = useTableParams();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<LeaveFormMode>("create");
  const [detail, setDetail] = useState<LeaveDetail | null>(null);
  const [detailPending, setDetailPending] = useState(false);
  const [pending, setPending] = useState<LeaveListItem | null>(null);

  async function openForm(mode: LeaveFormMode, publicId?: string) {
    setFormMode(mode);
    setDetail(null);
    setFormOpen(true);
    if (!publicId) return;
    setDetailPending(true);
    const result = await getLeaveAction({ publicId });
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
    const result = await deleteLeaveAction({ publicId: pending.publicId });
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    router.refresh();
  }

  const columns = useMemo<DataTableColumn<LeaveListItem>[]>(
    () => [
      {
        id: "employee",
        header: "Employee",
        cell: (row) => (
          <span className="font-medium">
            {row.user.employeeCode} · {formatFullName(row.user.firstName, row.user.lastName)}
          </span>
        ),
      },
      {
        id: "type",
        header: "Type",
        cell: (row) => LEAVE_TYPE_LABELS[row.type],
      },
      {
        id: "startDate",
        header: <SortableColumnHeader field="startDate" label="From" />,
        cell: (row) => formatDate(row.startDate),
      },
      {
        id: "endDate",
        header: <SortableColumnHeader field="endDate" label="To" />,
        cell: (row) => formatDate(row.endDate),
        hideBelowMd: true,
      },
      {
        id: "status",
        header: <SortableColumnHeader field="status" label="Status" />,
        cell: (row) => (
          <Badge variant={statusVariant(row.status)}>{LEAVE_STATUS_LABELS[row.status]}</Badge>
        ),
      },
      {
        id: "actions",
        header: <span className="sr-only">Actions</span>,
        align: "right",
        cell: (row) => (
          <RowActions
            label={`Actions for leave request by ${formatFullName(row.user.firstName, row.user.lastName)}`}
          >
            <DropdownMenuItem onSelect={() => void openForm("view", row.publicId)}>
              View
            </DropdownMenuItem>
            <Can permission={PERMISSIONS.LEAVE.EDIT}>
              <DropdownMenuItem onSelect={() => void openForm("edit", row.publicId)}>
                Edit
              </DropdownMenuItem>
            </Can>
            <Can permission={PERMISSIONS.LEAVE.DELETE}>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setPending(row)}>
                Delete
              </DropdownMenuItem>
            </Can>
          </RowActions>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <Card className={cn(isPending && "opacity-70")}>
        <FilterBar hasActiveFilters={isFiltered}>
          <SearchInput placeholder="Search employee or reason" label="Search leave" />
          <FilterSelect
            paramKey={TABLE_QUERY_KEYS.STATUS}
            label="Status"
            options={LEAVE_STATUS_OPTIONS}
            allLabel="All statuses"
          />
          <FilterSelect
            paramKey={TABLE_QUERY_KEYS.TYPE}
            label="Type"
            options={LEAVE_TYPE_OPTIONS}
            allLabel="All types"
          />
          <FilterSelect
            paramKey={TABLE_QUERY_KEYS.EMPLOYEE}
            label="Employee"
            options={employees.map((employee) => ({
              value: employee.publicId,
              label: `${employee.employeeCode} · ${formatFullName(employee.firstName, employee.lastName)}`,
            }))}
            allLabel="All employees"
            className="sm:w-56"
          />
          <div className={cn("flex flex-wrap items-center gap-2", !isFiltered && "sm:ml-auto")}>
            <Can permission={PERMISSIONS.LEAVE.CREATE}>
              <Button type="button" size="sm" onClick={() => void openForm("create")}>
                <PlusIcon />
                Add leave request
              </Button>
            </Can>
          </div>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={items}
          getRowId={(row) => row.publicId}
          isFiltered={isFiltered}
          caption="Leave requests"
        />
        {items.length > 0 || meta.totalItems > 0 ? <Pagination meta={meta} /> : null}
      </Card>

      <LeaveFormDialog
        open={formOpen}
        mode={formMode}
        detail={detail}
        isLoading={detailPending}
        employees={employees}
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
        title={
          pending
            ? `Delete leave request for ${formatFullName(pending.user.firstName, pending.user.lastName)}?`
            : ""
        }
        description="This leave request will be removed."
        confirmLabel="Delete leave request"
        variant="destructive"
        onConfirm={runPendingConfirm}
      />
    </>
  );
}
