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
  TASK_STATUS,
  TASK_STATUS_LABELS,
  TASK_STATUS_OPTIONS,
  type TaskStatus,
} from "@/constants/status";
import { deleteTaskAction, getTaskAction } from "@/features/tasks/actions";
import { TaskFormDialog, type TaskFormMode } from "@/features/tasks/components/task-form-dialog";
import { useTableParams } from "@/hooks/use-table-params";
import { cn } from "@/lib/utils";
import type { PaginationMeta } from "@/types/pagination";
import type { EmployeeOption } from "@/types/user";
import type { ProjectOption, TaskDetail, TaskListItem } from "@/types/work";
import { EMPTY_VALUE_PLACEHOLDER, formatDate, formatFullName } from "@/utils/format";

interface TasksWorkspaceProps {
  readonly items: readonly TaskListItem[];
  readonly meta: PaginationMeta;
  readonly isFiltered: boolean;
  readonly employees: readonly EmployeeOption[];
  readonly projects: readonly ProjectOption[];
}

function statusVariant(status: TaskStatus) {
  switch (status) {
    case TASK_STATUS.DONE:
      return "success" as const;
    case TASK_STATUS.IN_PROGRESS:
      return "info" as const;
    case TASK_STATUS.BLOCKED:
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

export function TasksWorkspace({
  items,
  meta,
  isFiltered,
  employees,
  projects,
}: TasksWorkspaceProps) {
  const router = useRouter();
  const { isPending } = useTableParams();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<TaskFormMode>("create");
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [detailPending, setDetailPending] = useState(false);
  const [pending, setPending] = useState<TaskListItem | null>(null);

  async function openForm(mode: TaskFormMode, publicId?: string) {
    setFormMode(mode);
    setDetail(null);
    setFormOpen(true);
    if (!publicId) return;
    setDetailPending(true);
    const result = await getTaskAction({ publicId });
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
    const result = await deleteTaskAction({ publicId: pending.publicId });
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    router.refresh();
  }

  const columns = useMemo<DataTableColumn<TaskListItem>[]>(
    () => [
      {
        id: "title",
        header: <SortableColumnHeader field="title" label="Task" />,
        cell: (row) => <span className="font-medium">{row.title}</span>,
      },
      {
        id: "project",
        header: "Project",
        cell: (row) => `${row.project.code} · ${row.project.name}`,
      },
      {
        id: "assignee",
        header: "Assignee",
        cell: (row) =>
          row.assignee
            ? formatFullName(row.assignee.firstName, row.assignee.lastName)
            : EMPTY_VALUE_PLACEHOLDER,
        hideBelowMd: true,
      },
      {
        id: "status",
        header: <SortableColumnHeader field="status" label="Status" />,
        cell: (row) => (
          <Badge variant={statusVariant(row.status)}>{TASK_STATUS_LABELS[row.status]}</Badge>
        ),
      },
      {
        id: "dueDate",
        header: <SortableColumnHeader field="dueDate" label="Due" />,
        cell: (row) => formatDate(row.dueDate),
        hideBelowMd: true,
      },
      {
        id: "actions",
        header: <span className="sr-only">Actions</span>,
        align: "right",
        cell: (row) => (
          <RowActions label={`Actions for ${row.title}`}>
            <DropdownMenuItem onSelect={() => void openForm("view", row.publicId)}>
              View
            </DropdownMenuItem>
            <Can permission={PERMISSIONS.TASKS.EDIT}>
              <DropdownMenuItem onSelect={() => void openForm("edit", row.publicId)}>
                Edit
              </DropdownMenuItem>
            </Can>
            <Can permission={PERMISSIONS.TASKS.DELETE}>
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
          <SearchInput placeholder="Search title or project" label="Search tasks" />
          <FilterSelect
            paramKey={TABLE_QUERY_KEYS.STATUS}
            label="Status"
            options={TASK_STATUS_OPTIONS}
            allLabel="All statuses"
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
          <FilterSelect
            paramKey={TABLE_QUERY_KEYS.EMPLOYEE}
            label="Assignee"
            options={employees.map((employee) => ({
              value: employee.publicId,
              label: `${employee.employeeCode} · ${formatFullName(employee.firstName, employee.lastName)}`,
            }))}
            allLabel="All assignees"
            className="sm:w-56"
          />
          <div className={cn("flex flex-wrap items-center gap-2", !isFiltered && "sm:ml-auto")}>
            <Can permission={PERMISSIONS.TASKS.CREATE}>
              <Button type="button" size="sm" onClick={() => void openForm("create")}>
                <PlusIcon />
                Add task
              </Button>
            </Can>
          </div>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={items}
          getRowId={(row) => row.publicId}
          isFiltered={isFiltered}
          caption="Tasks"
        />
        {items.length > 0 || meta.totalItems > 0 ? <Pagination meta={meta} /> : null}
      </Card>

      <TaskFormDialog
        open={formOpen}
        mode={formMode}
        detail={detail}
        isLoading={detailPending}
        employees={employees}
        projects={projects}
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
        title={pending ? `Delete ${pending.title}?` : ""}
        description="Worklogs must be removed before this task can be deleted."
        confirmLabel="Delete task"
        variant="destructive"
        onConfirm={runPendingConfirm}
      />
    </>
  );
}
