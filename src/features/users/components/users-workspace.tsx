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
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { FilterBar, FilterSelect } from "@/components/tables/filter-bar";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Pagination } from "@/components/tables/pagination";
import { RowActions } from "@/components/tables/row-actions";
import { SearchInput } from "@/components/tables/search-input";
import { SortableColumnHeader } from "@/components/tables/sortable-column-header";
import { PERMISSIONS } from "@/constants/permissions";
import { USER_MESSAGES } from "@/constants/messages";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { RECORD_STATUS, RECORD_STATUS_OPTIONS } from "@/constants/status";
import {
  activateUserAction,
  deactivateUserAction,
  deleteUserAction,
  exportUsersAction,
  getUserAction,
  sendUserPasswordResetAction,
} from "@/features/users/actions";
import { UserFormDialog, type UserFormMode } from "@/features/users/components/user-form-dialog";
import { useTableParams } from "@/hooks/use-table-params";
import { cn } from "@/lib/utils";
import type { PaginationMeta } from "@/types/pagination";
import type { UserAssignmentOptions, UserDetail, UserListItem } from "@/types/user";
import { EMPTY_VALUE_PLACEHOLDER, formatDateTime, formatFullName } from "@/utils/format";

interface UsersWorkspaceProps {
  readonly items: readonly UserListItem[];
  readonly meta: PaginationMeta;
  readonly isFiltered: boolean;
  readonly actorUserPublicId: string;
  readonly actorIsSuperAdmin: boolean;
  readonly options: UserAssignmentOptions;
  readonly exportFilters: {
    readonly search?: string;
    readonly status?: UserListItem["status"];
    readonly branchPublicId?: string;
    readonly rolePublicId?: string;
    readonly excludeSuperAdmin?: boolean;
  };
}

type PendingConfirm =
  | { readonly kind: "activate"; readonly row: UserListItem }
  | { readonly kind: "deactivate"; readonly row: UserListItem }
  | { readonly kind: "delete"; readonly row: UserListItem }
  | { readonly kind: "reset"; readonly row: UserListItem };

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function UsersWorkspace({
  items,
  meta,
  isFiltered,
  actorUserPublicId,
  actorIsSuperAdmin,
  options,
  exportFilters,
}: UsersWorkspaceProps) {
  const router = useRouter();
  const { isPending } = useTableParams();
  const [isExporting, startExport] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<UserFormMode>("create");
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailPending, setDetailPending] = useState(false);
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  async function openForm(mode: UserFormMode, publicId?: string) {
    setFormMode(mode);
    setFormOpen(true);

    if (!publicId) {
      setDetail(null);
      return;
    }

    setDetail(null);
    setDetailPending(true);
    const result = await getUserAction({ publicId });

    if (!result.success) {
      setDetailPending(false);
      toast.error(result.message);
      setFormOpen(false);
      return;
    }

    setDetail(result.data);
    setDetailPending(false);
  }

  function handleFormSuccess(message: string) {
    toast.success(message);
    router.refresh();
  }

  function handleExport() {
    startExport(async () => {
      const result = await exportUsersAction(exportFilters);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      downloadCsv(result.data.filename, result.data.csv);
      toast.success(result.data.truncated ? USER_MESSAGES.EXPORT_TRUNCATED : result.message);
    });
  }

  async function runPendingConfirm() {
    if (!pending) {
      return;
    }

    const { kind, row } = pending;
    const result =
      kind === "activate"
        ? await activateUserAction({ publicId: row.publicId })
        : kind === "deactivate"
          ? await deactivateUserAction({ publicId: row.publicId })
          : kind === "delete"
            ? await deleteUserAction({ publicId: row.publicId })
            : await sendUserPasswordResetAction({ publicId: row.publicId });

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    router.refresh();
  }

  const columns = useMemo<DataTableColumn<UserListItem>[]>(
    () => [
      {
        id: "name",
        header: <SortableColumnHeader field="firstName" label="Name" />,
        cell: (row) => (
          <span className="font-medium">
            {formatFullName(row.firstName, row.lastName)}
            {row.publicId === actorUserPublicId ? (
              <Badge variant="outline" className="ml-2">
                You
              </Badge>
            ) : null}
          </span>
        ),
      },
      {
        id: "employeeCode",
        header: <SortableColumnHeader field="employeeCode" label="Code" />,
        cell: (row) => (
          <span className="text-muted-foreground font-mono text-xs">{row.employeeCode}</span>
        ),
        hideBelowMd: true,
      },
      {
        id: "email",
        header: <SortableColumnHeader field="email" label="Email" />,
        cell: (row) => row.email,
        hideBelowMd: true,
      },
      {
        id: "branch",
        header: "Branch",
        cell: (row) => row.branch.name,
        hideBelowMd: true,
      },
      {
        id: "department",
        header: "Department",
        cell: (row) => row.department?.name ?? EMPTY_VALUE_PLACEHOLDER,
        hideBelowMd: true,
      },
      {
        id: "designation",
        header: "Designation",
        cell: (row) => row.jobTitle?.name ?? row.designation ?? EMPTY_VALUE_PLACEHOLDER,
        hideBelowMd: true,
      },
      {
        id: "role",
        header: "Role",
        cell: (row) => row.role.name,
      },
      {
        id: "status",
        header: <SortableColumnHeader field="status" label="Status" />,
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        id: "lastLoginAt",
        header: <SortableColumnHeader field="lastLoginAt" label="Last login" />,
        cell: (row) =>
          row.lastLoginAt ? formatDateTime(row.lastLoginAt) : EMPTY_VALUE_PLACEHOLDER,
        hideBelowMd: true,
      },
      {
        id: "actions",
        header: <span className="sr-only">Actions</span>,
        align: "right",
        cell: (row) => {
          const isOwn = row.publicId === actorUserPublicId;
          const privileged = row.isSuperAdmin && !actorIsSuperAdmin;
          const lastSuperAdmin = row.isSuperAdmin && options.superAdminCount <= 1;
          const canDeactivate = !isOwn && !privileged && !lastSuperAdmin;
          const canDelete = !isOwn && !privileged && !lastSuperAdmin;

          return (
            <RowActions label={`Actions for ${formatFullName(row.firstName, row.lastName)}`}>
              <DropdownMenuItem onSelect={() => void openForm("view", row.publicId)}>
                View
              </DropdownMenuItem>
              {!privileged ? (
                <Can permission={PERMISSIONS.USERS.EDIT}>
                  <DropdownMenuItem onSelect={() => void openForm("edit", row.publicId)}>
                    Edit
                  </DropdownMenuItem>
                </Can>
              ) : null}
              {!privileged && row.status === RECORD_STATUS.ACTIVE ? (
                <Can permission={PERMISSIONS.USERS.EDIT}>
                  <DropdownMenuItem onSelect={() => setPending({ kind: "reset", row })}>
                    Send password reset
                  </DropdownMenuItem>
                </Can>
              ) : null}
              <Can permission={PERMISSIONS.USERS.EDIT}>
                {row.status === RECORD_STATUS.INACTIVE && !privileged ? (
                  <DropdownMenuItem onSelect={() => setPending({ kind: "activate", row })}>
                    Activate
                  </DropdownMenuItem>
                ) : canDeactivate && row.status === RECORD_STATUS.ACTIVE ? (
                  <DropdownMenuItem onSelect={() => setPending({ kind: "deactivate", row })}>
                    Deactivate
                  </DropdownMenuItem>
                ) : null}
              </Can>
              {canDelete ? (
                <Can permission={PERMISSIONS.USERS.DELETE}>
                  <DropdownMenuSeparator />
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
    [actorIsSuperAdmin, actorUserPublicId, options.superAdminCount],
  );

  const confirmCopy =
    pending?.kind === "delete"
      ? {
          title: `Delete ${formatFullName(pending.row.firstName, pending.row.lastName)}?`,
          description:
            "The account will be removed from the directory and any open session will end. This cannot be undone from this screen.",
          confirmLabel: "Delete user",
          variant: "destructive" as const,
        }
      : pending?.kind === "deactivate"
        ? {
            title: `Deactivate ${formatFullName(pending.row.firstName, pending.row.lastName)}?`,
            description: "They will not be able to sign in until the account is activated again.",
            confirmLabel: "Deactivate",
            variant: "primary" as const,
          }
        : pending?.kind === "reset"
          ? {
              title: `Send a password reset to ${pending.row.email}?`,
              description:
                "A one-time link will be emailed. Their current password stays valid until they complete the reset.",
              confirmLabel: "Send reset email",
              variant: "primary" as const,
            }
          : pending
            ? {
                title: `Activate ${formatFullName(pending.row.firstName, pending.row.lastName)}?`,
                description: "They will be able to sign in again.",
                confirmLabel: "Activate",
                variant: "primary" as const,
              }
            : null;

  return (
    <>
      <Card className={cn(isPending && "opacity-70")}>
        <FilterBar hasActiveFilters={isFiltered}>
          <SearchInput placeholder="Search name, email or code" label="Search users" />
          <FilterSelect
            paramKey={TABLE_QUERY_KEYS.STATUS}
            label="Status"
            options={RECORD_STATUS_OPTIONS}
            allLabel="All statuses"
          />
          <FilterSelect
            paramKey={TABLE_QUERY_KEYS.ROLE}
            label="Role"
            options={options.roles.map((role) => ({
              value: role.publicId,
              label: role.name,
            }))}
            allLabel="All roles"
            className="sm:w-44"
          />
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <Can permission={PERMISSIONS.USERS.EXPORT}>
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
            <Can permission={PERMISSIONS.USERS.CREATE}>
              <Button type="button" size="sm" onClick={() => void openForm("create")}>
                <PlusIcon />
                Add user
              </Button>
            </Can>
          </div>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={items}
          getRowId={(row) => row.publicId}
          isFiltered={isFiltered}
          caption="Users"
        />
        {items.length > 0 || meta.totalItems > 0 ? <Pagination meta={meta} /> : null}
      </Card>

      <UserFormDialog
        open={formOpen}
        mode={formMode}
        detail={detail}
        isLoading={detailPending}
        branches={options.branches}
        roles={options.roles}
        departments={options.departments}
        designations={options.designations}
        actorIsSuperAdmin={actorIsSuperAdmin}
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
