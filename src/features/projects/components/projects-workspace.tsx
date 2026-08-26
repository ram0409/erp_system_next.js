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
  PROJECT_STATUS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_OPTIONS,
  type ProjectStatus,
} from "@/constants/status";
import { deleteProjectAction, getProjectAction } from "@/features/projects/actions";
import {
  ProjectFormDialog,
  type ProjectFormMode,
} from "@/features/projects/components/project-form-dialog";
import { useTableParams } from "@/hooks/use-table-params";
import { cn } from "@/lib/utils";
import type { PaginationMeta } from "@/types/pagination";
import type { EmployeeOption } from "@/types/user";
import type { ProjectDetail, ProjectListItem } from "@/types/work";
import { formatFullName } from "@/utils/format";

interface ProjectsWorkspaceProps {
  readonly items: readonly ProjectListItem[];
  readonly meta: PaginationMeta;
  readonly isFiltered: boolean;
  readonly employees: readonly EmployeeOption[];
}

function statusVariant(status: ProjectStatus) {
  switch (status) {
    case PROJECT_STATUS.ACTIVE:
      return "success" as const;
    case PROJECT_STATUS.PLANNED:
      return "info" as const;
    case PROJECT_STATUS.ON_HOLD:
      return "warning" as const;
    case PROJECT_STATUS.CANCELLED:
      return "destructive" as const;
    default:
      return "neutral" as const;
  }
}

export function ProjectsWorkspace({
  items,
  meta,
  isFiltered,
  employees,
}: ProjectsWorkspaceProps) {
  const router = useRouter();
  const { isPending } = useTableParams();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<ProjectFormMode>("create");
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [detailPending, setDetailPending] = useState(false);
  const [pending, setPending] = useState<ProjectListItem | null>(null);

  async function openForm(mode: ProjectFormMode, publicId?: string) {
    setFormMode(mode);
    setDetail(null);
    setFormOpen(true);
    if (!publicId) return;
    setDetailPending(true);
    const result = await getProjectAction({ publicId });
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
    const result = await deleteProjectAction({ publicId: pending.publicId });
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    router.refresh();
  }

  const columns = useMemo<DataTableColumn<ProjectListItem>[]>(
    () => [
      {
        id: "code",
        header: <SortableColumnHeader field="code" label="Code" />,
        cell: (row) => <span className="text-muted-foreground font-mono text-xs">{row.code}</span>,
      },
      {
        id: "name",
        header: <SortableColumnHeader field="name" label="Name" />,
        cell: (row) => <span className="font-medium">{row.name}</span>,
      },
      {
        id: "owner",
        header: "Owner",
        cell: (row) => formatFullName(row.owner.firstName, row.owner.lastName),
        hideBelowMd: true,
      },
      {
        id: "status",
        header: <SortableColumnHeader field="status" label="Status" />,
        cell: (row) => (
          <Badge variant={statusVariant(row.status)}>{PROJECT_STATUS_LABELS[row.status]}</Badge>
        ),
      },
      {
        id: "tasks",
        header: "Tasks",
        cell: (row) => row.taskCount,
        hideBelowMd: true,
        align: "right",
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
            <Can permission={PERMISSIONS.PROJECTS.EDIT}>
              <DropdownMenuItem onSelect={() => void openForm("edit", row.publicId)}>
                Edit
              </DropdownMenuItem>
            </Can>
            <Can permission={PERMISSIONS.PROJECTS.DELETE}>
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
          <SearchInput placeholder="Search name or code" label="Search projects" />
          <FilterSelect
            paramKey={TABLE_QUERY_KEYS.STATUS}
            label="Status"
            options={PROJECT_STATUS_OPTIONS}
            allLabel="All statuses"
          />
          <div className={cn("flex flex-wrap items-center gap-2", !isFiltered && "sm:ml-auto")}>
            <Can permission={PERMISSIONS.PROJECTS.CREATE}>
              <Button type="button" size="sm" onClick={() => void openForm("create")}>
                <PlusIcon />
                Add project
              </Button>
            </Can>
          </div>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={items}
          getRowId={(row) => row.publicId}
          isFiltered={isFiltered}
          caption="Projects"
        />
        {items.length > 0 || meta.totalItems > 0 ? <Pagination meta={meta} /> : null}
      </Card>

      <ProjectFormDialog
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
        title={pending ? `Delete ${pending.name}?` : ""}
        description="Tasks must be removed before this project can be deleted."
        confirmLabel="Delete project"
        variant="destructive"
        onConfirm={runPendingConfirm}
      />
    </>
  );
}
