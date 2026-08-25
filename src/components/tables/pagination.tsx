"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS, TABLE_QUERY_KEYS } from "@/constants/pagination";
import { useTableParams } from "@/hooks/use-table-params";
import type { PaginationMeta } from "@/types/pagination";
import { formatNumber } from "@/utils/format";

interface PaginationProps {
  meta: PaginationMeta;
}

export function Pagination({ meta }: PaginationProps) {
  const { setParams } = useTableParams();
  const { page, pageSize, totalItems, totalPages, hasPreviousPage, hasNextPage } = meta;

  const firstRow = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, totalItems);

  function goToPage(target: number) {
    setParams({ [TABLE_QUERY_KEYS.PAGE]: String(target) }, { resetPage: false });
  }

  return (
    <nav
      aria-label="Pagination"
      className="border-border flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-muted-foreground text-sm" aria-live="polite">
        {totalItems === 0
          ? "No records"
          : `Showing ${formatNumber(firstRow)}–${formatNumber(lastRow)} of ${formatNumber(totalItems)}`}
      </p>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground hidden text-sm sm:inline">Rows</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => setParams({ [TABLE_QUERY_KEYS.PAGE_SIZE]: value })}
          >
            <SelectTrigger size="sm" aria-label="Rows per page" className="w-[4.5rem]">
              <SelectValue placeholder="Rows" />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(page - 1)}
            disabled={!hasPreviousPage}
            aria-label="Previous page"
          >
            <ChevronLeftIcon />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <span className="text-muted-foreground text-sm whitespace-nowrap">
            Page {formatNumber(page)} of {formatNumber(Math.max(totalPages, 1))}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(page + 1)}
            disabled={!hasNextPage}
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </nav>
  );
}
