"use client";

import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Can } from "@/components/shared/can";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
import { deleteWorklogAction, getWorklogAction } from "@/features/worklogs/actions";
import {
  WorklogFormDialog,
  type WorklogFormMode,
} from "@/features/worklogs/components/worklog-form-dialog";
import { useTableParams } from "@/hooks/use-table-params";
import { cn } from "@/lib/utils";
import type { PaginationMeta } from "@/types/pagination";
import type { EmployeeOption } from "@/types/user";
import type { ProjectOption, TaskOption, WorklogDetail, WorklogListItem } from "@/types/work";
import { formatDate, formatFullName, formatNumber } from "@/utils/format";

interface WorklogsWorkspaceProps {
  readonly items: readonly WorklogListItem[];
  readonly meta: PaginationMeta;
  readonly isFiltered: boolean;
  readonly employees: readonly EmployeeOption[];
  readonly tasks: readonly TaskOption[];
  readonly projects: readonly ProjectOption[];
}

export function WorklogsWorkspace({
  items,
  meta,
  isFiltered,
  employees,
  tasks,
  projects,
}: WorklogsWorkspaceProps) {
  const router = useRouter();
  const { isPending } = useTableParams();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<WorklogFormMode>("create");
  const [detail, setDetail] = useState<WorklogDetail | null>(null);
  const [detailPending, setDetailPending] = useState(false);
  const [pending, setPending] = useState<WorklogListItem | null>(null);

  async function openForm(mode: WorklogFormMode, publicId?: string) {
    setFormMode(mode);
    setDetail(null);
    setFormOpen(true);
    if (!publicId) return;
    setDetailPending(true);
    const result = await getWorklogAction({ publicId });
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
    const result = await deleteWorklogAction({ publicId: pending.publicId });
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    router.refresh();
  }

  const columns = useMemo<DataTableColumn<WorklogListItem>[]>(
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
            {formatFullName(row.user.firstName, row.user.lastName)}
          </span>
        ),
      },
      {
        id: "task",
        header: "Task",
        cell: (row) => `${row.task.project.code} · ${row.task.title}`,
      },
      {
        id: "hours",
        header: <SortableColumnHeader field="hours" label="Hours" />,
        cell: (row) => formatNumber(row.hours),
        align: "right",
      },
      {
        id: "actions",
        header: <span className="sr-only">Actions</span>,
        align: "right",
        cell: (row) => (
          <RowActions
            label={`Actions for worklog by ${formatFullName(row.user.firstName, row.user.lastName)}`}
          >
            <DropdownMenuItem onSelect={() => void openForm("view", row.publicId)}>
              View
            </DropdownMenuItem>
            <Can permission={PERMISSIONS.WORKLOGS.EDIT}>
              <DropdownMenuItem onSelect={() => void openForm("edit", row.publicId)}>
                Edit
              </DropdownMenuItem>
            </Can>
            <Can permission={PERMISSIONS.WORKLOGS.DELETE}>
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
          <SearchInput placeholder="Search employee, task or notes" label="Search worklogs" />
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
          <FilterSelect
            paramKey={TABLE_QUERY_KEYS.PROJECT}
            label="Project"
            options={projects.map((project) => ({
              value: project.publicId,
              label: `${project.code} · ${project.name}`,
            }))}
            allLabel="All projects"
            className="sm:w-52"
          />
          <div className={cn("flex flex-wrap items-center gap-2", !isFiltered && "sm:ml-auto")}>
            <Can permission={PERMISSIONS.WORKLOGS.CREATE}>
              <Button type="button" size="sm" onClick={() => void openForm("create")}>
                <PlusIcon />
                Add worklog
              </Button>
            </Can>
          </div>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={items}
          getRowId={(row) => row.publicId}
          isFiltered={isFiltered}
          caption="Worklogs"
        />
        {items.length > 0 || meta.totalItems > 0 ? <Pagination meta={meta} /> : null}
      </Card>

      <WorklogFormDialog
        open={formOpen}
        mode={formMode}
        detail={detail}
        isLoading={detailPending}
        employees={employees}
        tasks={tasks}
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
            ? `Delete worklog for ${formatFullName(pending.user.firstName, pending.user.lastName)}?`
            : ""
        }
        description="This worklog will be removed."
        confirmLabel="Delete worklog"
        variant="destructive"
        onConfirm={runPendingConfirm}
      />
    </>
  );
}
