"use client";

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";

import { SORT_DIRECTIONS, TABLE_QUERY_KEYS } from "@/constants/pagination";
import { useTableParams } from "@/hooks/use-table-params";

interface SortableColumnHeaderProps {
  /** Must be one of the fields the server allowlists for this table. */
  field: string;
  label: string;
}

export function SortableColumnHeader({ field, label }: SortableColumnHeaderProps) {
  const { getParam, setParams } = useTableParams();
  const activeField = getParam(TABLE_QUERY_KEYS.SORT_BY);
  const activeDir = getParam(TABLE_QUERY_KEYS.SORT_DIR);

  const isActive = activeField === field;
  const nextDir =
    isActive && activeDir === SORT_DIRECTIONS.ASC ? SORT_DIRECTIONS.DESC : SORT_DIRECTIONS.ASC;

  const Icon = !isActive
    ? ArrowUpDownIcon
    : activeDir === SORT_DIRECTIONS.ASC
      ? ArrowUpIcon
      : ArrowDownIcon;

  return (
    <button
      type="button"
      onClick={() =>
        setParams({
          [TABLE_QUERY_KEYS.SORT_BY]: field,
          [TABLE_QUERY_KEYS.SORT_DIR]: nextDir,
        })
      }
      aria-label={`Sort by ${label}`}
      className="group hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-sm text-xs font-semibold tracking-wide uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      {label}
      <Icon
        className={
          isActive
            ? "text-foreground size-3.5"
            : "text-muted-foreground/50 group-hover:text-muted-foreground size-3.5"
        }
        aria-hidden="true"
      />
    </button>
  );
}
