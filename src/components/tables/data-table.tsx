import type { ReactNode } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EMPTY_STATE_MESSAGES } from "@/constants/messages";
import { cn } from "@/lib/utils";

export interface DataTableColumn<TRow> {
  /** Stable key; also used as the React key for cells. */
  readonly id: string;
  readonly header: ReactNode;
  readonly cell: (row: TRow) => ReactNode;
  readonly className?: string;
  readonly headerClassName?: string;
  /** Hidden below the `md` breakpoint to keep narrow screens readable. */
  readonly hideBelowMd?: boolean;
  /** Pinned to the right edge, for the actions column. */
  readonly align?: "left" | "right";
}

interface DataTableProps<TRow> {
  columns: readonly DataTableColumn<TRow>[];
  rows: readonly TRow[];
  getRowId: (row: TRow) => string;
  /** Shown instead of rows when the result set is empty. */
  emptyState?: ReactNode;
  /** True when a search or filter is applied, which changes the empty copy. */
  isFiltered?: boolean;
  caption?: string;
}

/**
 * Presentational table. It receives an already-paginated page of rows — it never
 * sorts, filters or slices, because doing any of that here would mean the full
 * dataset had been shipped to the client.
 */
export function DataTable<TRow>({
  columns,
  rows,
  getRowId,
  emptyState,
  isFiltered = false,
  caption,
}: DataTableProps<TRow>) {
  if (rows.length === 0) {
    return (
      <>
        {emptyState ?? (
          <EmptyState
            variant={isFiltered ? "no-results" : "empty"}
            title={isFiltered ? EMPTY_STATE_MESSAGES.NO_RESULTS : EMPTY_STATE_MESSAGES.NO_RECORDS}
            description={
              isFiltered
                ? "Try a different search term or clear your filters."
                : "Records will appear here once they are added."
            }
            className="px-5 pb-5"
          />
        )}
      </>
    );
  }

  return (
    <div className="px-5 pt-4">
      <TableContainer className="border-border/80 rounded-sm border">
        <Table>
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(
                    column.hideBelowMd && "hidden md:table-cell",
                    column.align === "right" && "text-right",
                    column.headerClassName,
                  )}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={getRowId(row)}>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    className={cn(
                      column.hideBelowMd && "hidden md:table-cell",
                      column.align === "right" && "text-right",
                      column.className,
                    )}
                  >
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
