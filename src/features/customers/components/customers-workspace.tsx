"use client";

import { DownloadIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Can } from "@/components/shared/can";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
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
import { CUSTOMER_MESSAGES } from "@/constants/messages";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { RECORD_STATUS, RECORD_STATUS_OPTIONS } from "@/constants/status";
import {
  activateCustomerAction,
  deactivateCustomerAction,
  deleteCustomerAction,
  exportCustomersAction,
  getCustomerAction,
} from "@/features/customers/actions";
import {
  CustomerFormDialog,
  type CustomerFormMode,
} from "@/features/customers/components/customer-form-dialog";
import { useTableParams } from "@/hooks/use-table-params";
import { cn } from "@/lib/utils";
import type { CustomerBranchOption, CustomerDetail, CustomerListItem } from "@/types/customer";
import type { PaginationMeta } from "@/types/pagination";
import { EMPTY_VALUE_PLACEHOLDER, formatDate } from "@/utils/format";

interface CustomersWorkspaceProps {
  readonly items: readonly CustomerListItem[];
  readonly meta: PaginationMeta;
  readonly isFiltered: boolean;
  readonly branches: readonly CustomerBranchOption[];
  readonly workspaceBranchPublicId: string;
  readonly exportFilters: {
    readonly search?: string;
    readonly status?: CustomerListItem["status"];
  };
}

type PendingConfirm =
  | { readonly kind: "activate"; readonly row: CustomerListItem }
  | { readonly kind: "deactivate"; readonly row: CustomerListItem }
  | { readonly kind: "delete"; readonly row: CustomerListItem };

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function CustomersWorkspace({
  items,
  meta,
  isFiltered,
  branches,
  workspaceBranchPublicId,
  exportFilters,
}: CustomersWorkspaceProps) {
  const router = useRouter();
  const { isPending } = useTableParams();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<CustomerFormMode>("create");
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailPending, setDetailPending] = useState(false);
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [isExporting, startExport] = useTransition();

  async function openForm(mode: CustomerFormMode, publicId?: string) {
    setFormMode(mode);
    setDetail(null);
    setFormOpen(true);

    if (!publicId) {
      return;
    }

    setDetailPending(true);
    const result = await getCustomerAction({ publicId });
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
        ? await activateCustomerAction({ publicId: row.publicId })
        : kind === "deactivate"
          ? await deactivateCustomerAction({ publicId: row.publicId })
          : await deleteCustomerAction({ publicId: row.publicId });

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    router.refresh();
  }

  function handleExport() {
    startExport(async () => {
      const result = await exportCustomersAction({
        ...(exportFilters.search ? { search: exportFilters.search } : {}),
        ...(exportFilters.status ? { status: exportFilters.status } : {}),
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      downloadCsv(result.data.filename, result.data.csv);
      if (result.data.truncated) {
        toast.warning(CUSTOMER_MESSAGES.EXPORT_TRUNCATED);
      } else {
        toast.success(result.message);
      }
    });
  }

  const columns = useMemo<DataTableColumn<CustomerListItem>[]>(
    () => [
      {
        id: "code",
        header: <SortableColumnHeader field="code" label="Code" />,
        cell: (row) => <span className="font-medium">{row.code}</span>,
      },
      {
        id: "name",
        header: <SortableColumnHeader field="name" label="Name" />,
        cell: (row) => <span className="truncate">{row.name}</span>,
      },
      {
        id: "branch",
        header: "Branch",
        cell: (row) => (
          <span className="truncate">
            {row.branch.name}
            <span className="text-muted-foreground"> ({row.branch.code})</span>
          </span>
        ),
        hideBelowMd: true,
      },
      {
        id: "contactPerson",
        header: "Contact",
        cell: (row) => row.contactPerson ?? EMPTY_VALUE_PLACEHOLDER,
        hideBelowMd: true,
      },
      {
        id: "email",
        header: "Email",
        cell: (row) => row.email ?? EMPTY_VALUE_PLACEHOLDER,
        hideBelowMd: true,
      },
      {
        id: "phone",
        header: "Phone",
        cell: (row) => row.phone ?? EMPTY_VALUE_PLACEHOLDER,
        hideBelowMd: true,
      },
      {
        id: "city",
        header: <SortableColumnHeader field="city" label="City" />,
        cell: (row) => row.city ?? EMPTY_VALUE_PLACEHOLDER,
        hideBelowMd: true,
      },
      {
        id: "status",
        header: <SortableColumnHeader field="status" label="Status" />,
        cell: (row) => <StatusBadge status={row.status} />,
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
            <Can permission={PERMISSIONS.CUSTOMERS.EDIT}>
              <DropdownMenuItem onSelect={() => void openForm("edit", row.publicId)}>
                Edit
              </DropdownMenuItem>
            </Can>
            <Can permission={PERMISSIONS.CUSTOMERS.EDIT}>
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
            <Can permission={PERMISSIONS.CUSTOMERS.DELETE}>
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
          description: "The customer will be removed from the list. This cannot be undone from this screen.",
          confirmLabel: "Delete customer",
          variant: "destructive" as const,
        }
      : pending?.kind === "deactivate"
        ? {
            title: `Deactivate ${pending.row.name}?`,
            description: "Inactive customers stay in history but are hidden from active use.",
            confirmLabel: "Deactivate",
            variant: "primary" as const,
          }
        : pending
          ? {
              title: `Activate ${pending.row.name}?`,
              description: "The customer will be available for use again.",
              confirmLabel: "Activate",
              variant: "primary" as const,
            }
          : null;

  return (
    <>
      <Card className={cn(isPending && "opacity-70")}>
        <FilterBar hasActiveFilters={isFiltered}>
          <SearchInput placeholder="Search code, name, contact…" label="Search customers" />
          <FilterSelect
            paramKey={TABLE_QUERY_KEYS.STATUS}
            label="Status"
            options={RECORD_STATUS_OPTIONS}
            allLabel="All statuses"
            className="sm:w-44"
          />
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <Can permission={PERMISSIONS.CUSTOMERS.EXPORT}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isExporting}
                onClick={handleExport}
              >
                <DownloadIcon />
                Export
              </Button>
            </Can>
            <Can permission={PERMISSIONS.CUSTOMERS.CREATE}>
              <Button type="button" size="sm" onClick={() => void openForm("create")}>
                <PlusIcon />
                Add customer
              </Button>
            </Can>
          </div>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={items}
          getRowId={(row) => row.publicId}
          isFiltered={isFiltered}
          caption="Customers"
        />
        {items.length > 0 || meta.totalItems > 0 ? <Pagination meta={meta} /> : null}
      </Card>

      <CustomerFormDialog
        open={formOpen}
        mode={formMode}
        detail={detail}
        isLoading={detailPending}
        branches={branches}
        defaultBranchPublicId={workspaceBranchPublicId}
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
