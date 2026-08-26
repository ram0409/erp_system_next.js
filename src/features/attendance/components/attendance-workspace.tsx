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
  ATTENDANCE_DAY_STATUS,
  ATTENDANCE_DAY_STATUS_LABELS,
  ATTENDANCE_DAY_STATUS_OPTIONS,
  type AttendanceDayStatus,
} from "@/constants/status";
import {
  deleteAttendanceAction,
  getAttendanceAction,
} from "@/features/attendance/actions";
import {
  AttendanceFormDialog,
  type AttendanceFormMode,
} from "@/features/attendance/components/attendance-form-dialog";
import { useTableParams } from "@/hooks/use-table-params";
import { cn } from "@/lib/utils";
import type { AttendanceDetail, AttendanceListItem } from "@/types/hr";
import type { PaginationMeta } from "@/types/pagination";
import type { EmployeeOption } from "@/types/user";
import { EMPTY_VALUE_PLACEHOLDER, formatDate, formatFullName } from "@/utils/format";

interface AttendanceWorkspaceProps {
  readonly items: readonly AttendanceListItem[];
  readonly meta: PaginationMeta;
  readonly isFiltered: boolean;
  readonly employees: readonly EmployeeOption[];
}

function statusVariant(status: AttendanceDayStatus) {
  switch (status) {
    case ATTENDANCE_DAY_STATUS.PRESENT:
      return "success" as const;
    case ATTENDANCE_DAY_STATUS.ABSENT:
      return "destructive" as const;
    case ATTENDANCE_DAY_STATUS.HALF_DAY:
      return "warning" as const;
    case ATTENDANCE_DAY_STATUS.ON_LEAVE:
      return "info" as const;
    default:
      return "neutral" as const;
  }
}

export function AttendanceWorkspace({
  items,
  meta,
  isFiltered,
  employees,
}: AttendanceWorkspaceProps) {
  const router = useRouter();
  const { isPending } = useTableParams();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<AttendanceFormMode>("create");
  const [detail, setDetail] = useState<AttendanceDetail | null>(null);
  const [detailPending, setDetailPending] = useState(false);
  const [pending, setPending] = useState<AttendanceListItem | null>(null);

  async function openForm(mode: AttendanceFormMode, publicId?: string) {
    setFormMode(mode);
    setDetail(null);
    setFormOpen(true);
    if (!publicId) return;
    setDetailPending(true);
    const result = await getAttendanceAction({ publicId });
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
    const result = await deleteAttendanceAction({ publicId: pending.publicId });
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    router.refresh();
  }

  const columns = useMemo<DataTableColumn<AttendanceListItem>[]>(
    () => [
      {
        id: "workDate",
        header: <SortableColumnHeader field="workDate" label="Date" />,
        cell: (row) => formatDate(row.workDate),
      },
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
        id: "status",
        header: <SortableColumnHeader field="status" label="Status" />,
        cell: (row) => (
          <Badge variant={statusVariant(row.status)}>{ATTENDANCE_DAY_STATUS_LABELS[row.status]}</Badge>
        ),
      },
      {
        id: "checkIn",
        header: "Check in",
        cell: (row) => row.checkIn ?? EMPTY_VALUE_PLACEHOLDER,
        hideBelowMd: true,
      },
      {
        id: "checkOut",
        header: "Check out",
        cell: (row) => row.checkOut ?? EMPTY_VALUE_PLACEHOLDER,
        hideBelowMd: true,
      },
      {
        id: "actions",
        header: <span className="sr-only">Actions</span>,
        align: "right",
        cell: (row) => (
          <RowActions
            label={`Actions for ${formatFullName(row.user.firstName, row.user.lastName)} on ${formatDate(row.workDate)}`}
          >
            <DropdownMenuItem onSelect={() => void openForm("view", row.publicId)}>
              View
            </DropdownMenuItem>
            <Can permission={PERMISSIONS.ATTENDANCE.EDIT}>
              <DropdownMenuItem onSelect={() => void openForm("edit", row.publicId)}>
                Edit
              </DropdownMenuItem>
            </Can>
            <Can permission={PERMISSIONS.ATTENDANCE.DELETE}>
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
          <SearchInput placeholder="Search employee or notes" label="Search attendance" />
          <FilterSelect
            paramKey={TABLE_QUERY_KEYS.STATUS}
            label="Status"
            options={ATTENDANCE_DAY_STATUS_OPTIONS}
            allLabel="All statuses"
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
            <Can permission={PERMISSIONS.ATTENDANCE.CREATE}>
              <Button type="button" size="sm" onClick={() => void openForm("create")}>
                <PlusIcon />
                Add attendance
              </Button>
            </Can>
          </div>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={items}
          getRowId={(row) => row.publicId}
          isFiltered={isFiltered}
          caption="Attendance"
        />
        {items.length > 0 || meta.totalItems > 0 ? <Pagination meta={meta} /> : null}
      </Card>

      <AttendanceFormDialog
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
        title={pending ? `Delete attendance for ${formatFullName(pending.user.firstName, pending.user.lastName)}?` : ""}
        description="This attendance record will be removed."
        confirmLabel="Delete attendance"
        variant="destructive"
        onConfirm={runPendingConfirm}
      />
    </>
  );
}
