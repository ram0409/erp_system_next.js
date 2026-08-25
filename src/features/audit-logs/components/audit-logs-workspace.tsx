"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FilterBar, FilterSelect } from "@/components/tables/filter-bar";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { Pagination } from "@/components/tables/pagination";
import { SearchInput } from "@/components/tables/search-input";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import { AUDIT_ACTION_OPTIONS } from "@/constants/status";
import { useTableParams } from "@/hooks/use-table-params";
import { cn } from "@/lib/utils";
import type { AuditLogListItem } from "@/types/audit-log";
import type { PaginationMeta } from "@/types/pagination";
import { EMPTY_VALUE_PLACEHOLDER, formatDateTime } from "@/utils/format";

interface AuditLogsWorkspaceProps {
  readonly items: readonly AuditLogListItem[];
  readonly meta: PaginationMeta;
  readonly isFiltered: boolean;
}

export function AuditLogsWorkspace({ items, meta, isFiltered }: AuditLogsWorkspaceProps) {
  const { isPending } = useTableParams();

  const columns = useMemo<DataTableColumn<AuditLogListItem>[]>(
    () => [
      {
        id: "createdAt",
        header: "When",
        cell: (row) => (
          <span className="text-muted-foreground tabular-nums">
            {formatDateTime(row.createdAt)}
          </span>
        ),
      },
      {
        id: "action",
        header: "Action",
        cell: (row) => <Badge variant="neutral">{row.actionLabel}</Badge>,
      },
      {
        id: "summary",
        header: "Summary",
        cell: (row) => (
          <div className="min-w-0">
            <p className="text-foreground truncate text-sm">{row.summary ?? row.actionLabel}</p>
            <p className="text-muted-foreground truncate text-xs">
              {row.entityType}
              {row.entityPublicId ? ` · ${row.entityPublicId}` : ""}
            </p>
          </div>
        ),
      },
      {
        id: "actor",
        header: "Actor",
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm">{row.actorName ?? "System"}</p>
            <p className="text-muted-foreground truncate text-xs">
              {row.actorEmail ?? EMPTY_VALUE_PLACEHOLDER}
            </p>
          </div>
        ),
        hideBelowMd: true,
      },
      {
        id: "ipAddress",
        header: "IP",
        cell: (row) => (
          <span className="text-muted-foreground font-mono text-xs">
            {row.ipAddress ?? EMPTY_VALUE_PLACEHOLDER}
          </span>
        ),
        hideBelowMd: true,
      },
    ],
    [],
  );

  return (
    <Card className={cn(isPending && "opacity-70")}>
      <FilterBar hasActiveFilters={isFiltered}>
        <SearchInput placeholder="Search actor, summary or entity" label="Search audit logs" />
        <FilterSelect
          paramKey={TABLE_QUERY_KEYS.ACTION}
          label="Action"
          options={AUDIT_ACTION_OPTIONS}
          allLabel="All actions"
          className="sm:w-52"
        />
      </FilterBar>
      <DataTable
        columns={columns}
        rows={items}
        getRowId={(row) => row.key}
        isFiltered={isFiltered}
        caption="Audit logs"
      />
      {items.length > 0 || meta.totalItems > 0 ? <Pagination meta={meta} /> : null}
    </Card>
  );
}
