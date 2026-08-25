"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { ROUTES } from "@/constants/routes";
import { RECORD_STATUS, RECORD_STATUS_OPTIONS } from "@/constants/status";
import {
  activateRoleAction,
  deactivateRoleAction,
  deleteRoleAction,
  getRoleAction,
} from "@/features/roles/actions";
import { RoleFormDialog, type RoleFormMode } from "@/features/roles/components/role-form-dialog";
import { useTableParams } from "@/hooks/use-table-params";
import { cn } from "@/lib/utils";
import type { PaginationMeta } from "@/types/pagination";
import type { RoleDetail, RoleListItem } from "@/types/role";
import { EMPTY_VALUE_PLACEHOLDER, formatDate } from "@/utils/format";

interface RolesWorkspaceProps {
  readonly items: readonly RoleListItem[];
  readonly meta: PaginationMeta;
  readonly isFiltered: boolean;
  readonly actorRolePublicId: string;
}

type PendingConfirm =
  | { readonly kind: "activate"; readonly row: RoleListItem }
  | { readonly kind: "deactivate"; readonly row: RoleListItem }
  | { readonly kind: "delete"; readonly row: RoleListItem };

function permissionsHref(publicId: string): string {
  return `${ROUTES.ROLE_PERMISSIONS}?${TABLE_QUERY_KEYS.ROLE}=${encodeURIComponent(publicId)}`;
}

export function RolesWorkspace({
  items,
  meta,
  isFiltered,
  actorRolePublicId,
}: RolesWorkspaceProps) {
  const router = useRouter();
  const { isPending } = useTableParams();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<RoleFormMode>("create");
  const [detail, setDetail] = useState<RoleDetail | null>(null);
  const [detailPending, setDetailPending] = useState(false);
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  async function openForm(mode: RoleFormMode, publicId?: string) {
    setFormMode(mode);
    setDetail(null);
    setFormOpen(true);

    if (!publicId) {
      return;
    }

    setDetailPending(true);
    const result = await getRoleAction({ publicId });
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
        ? await activateRoleAction({ publicId: row.publicId })
        : kind === "deactivate"
          ? await deactivateRoleAction({ publicId: row.publicId })
          : await deleteRoleAction({ publicId: row.publicId });

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    router.refresh();
  }

  const columns = useMemo<DataTableColumn<RoleListItem>[]>(
    () => [
      {
        id: "name",
        header: <SortableColumnHeader field="name" label="Name" />,
        cell: (row) => (
          <span className="font-medium">
            {row.name}
            {row.isSuperAdmin ? (
              <Badge variant="info" className="ml-2">
                Super Admin
              </Badge>
            ) : row.isSystem ? (
              <Badge variant="neutral" className="ml-2">
                System
              </Badge>
            ) : null}
          </span>
        ),
      },
      {
        id: "slug",
        header: <SortableColumnHeader field="slug" label="Slug" />,
        cell: (row) => <span className="text-muted-foreground font-mono text-xs">{row.slug}</span>,
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
        id: "permissions",
        header: "Permissions",
        cell: (row) => (row.isSuperAdmin ? EMPTY_VALUE_PLACEHOLDER : row.permissionCount),
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
          const isOwn = row.publicId === actorRolePublicId;
          const canDeactivate = !isOwn && !row.isSuperAdmin;
          const canDelete = !isOwn && !row.isSystem;

          return (
            <RowActions label={`Actions for ${row.name}`}>
              <DropdownMenuItem onSelect={() => void openForm("view", row.publicId)}>
                View
              </DropdownMenuItem>
              <Can permission={PERMISSIONS.ROLES.EDIT}>
                <DropdownMenuItem onSelect={() => void openForm("edit", row.publicId)}>
                  Edit
                </DropdownMenuItem>
              </Can>
              <Can permission={PERMISSIONS.ROLE_PERMISSIONS.VIEW}>
                <DropdownMenuItem asChild>
                  <Link href={permissionsHref(row.publicId)}>Permissions</Link>
                </DropdownMenuItem>
              </Can>
              <Can permission={PERMISSIONS.ROLES.EDIT}>
                {row.status === RECORD_STATUS.INACTIVE ? (
                  <DropdownMenuItem onSelect={() => setPending({ kind: "activate", row })}>
                    Activate
                  </DropdownMenuItem>
                ) : canDeactivate ? (
                  <DropdownMenuItem onSelect={() => setPending({ kind: "deactivate", row })}>
                    Deactivate
                  </DropdownMenuItem>
                ) : null}
              </Can>
              {canDelete ? (
                <Can permission={PERMISSIONS.ROLES.DELETE}>
                  <DropdownMenuSeparator />
                </Can>
              ) : null}
              {canDelete ? (
                <Can permission={PERMISSIONS.ROLES.DELETE}>
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
    [actorRolePublicId],
  );

  const confirmCopy =
    pending?.kind === "delete"
      ? {
          title: `Delete ${pending.row.name}?`,
          description:
            "This role will be removed permanently. Assigned permission grants will be deleted with it. Users must be reassigned first.",
          confirmLabel: "Delete role",
          variant: "destructive" as const,
        }
      : pending?.kind === "deactivate"
        ? {
            title: `Deactivate ${pending.row.name}?`,
            description:
              "Users assigned to an inactive role cannot sign in. Reassign them first if anyone still holds this role.",
            confirmLabel: "Deactivate",
            variant: "primary" as const,
          }
        : pending
          ? {
              title: `Activate ${pending.row.name}?`,
              description: "Users with this role will be able to sign in again.",
              confirmLabel: "Activate",
              variant: "primary" as const,
            }
          : null;

  return (
    <>
      <Card className={cn(isPending && "opacity-70")}>
        <FilterBar hasActiveFilters={isFiltered}>
          <SearchInput placeholder="Search name or slug" label="Search roles" />
          <FilterSelect
            paramKey={TABLE_QUERY_KEYS.STATUS}
            label="Status"
            options={RECORD_STATUS_OPTIONS}
            allLabel="All statuses"
          />
          <div className={cn("flex flex-wrap items-center gap-2", !isFiltered && "sm:ml-auto")}>
            <Can permission={PERMISSIONS.ROLES.CREATE}>
              <Button type="button" size="sm" onClick={() => void openForm("create")}>
                <PlusIcon />
                Add role
              </Button>
            </Can>
          </div>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={items}
          getRowId={(row) => row.publicId}
          isFiltered={isFiltered}
          caption="Roles"
        />
        {items.length > 0 || meta.totalItems > 0 ? <Pagination meta={meta} /> : null}
      </Card>

      <RoleFormDialog
        open={formOpen}
        mode={formMode}
        detail={detail}
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
