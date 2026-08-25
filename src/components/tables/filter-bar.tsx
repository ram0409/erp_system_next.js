"use client";

import { FilterXIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTableParams } from "@/hooks/use-table-params";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  children: ReactNode;
  /** Shows the reset control only when at least one filter is applied. */
  hasActiveFilters?: boolean;
  className?: string;
}

export function FilterBar({ children, hasActiveFilters = false, className }: FilterBarProps) {
  const { clearFilters } = useTableParams();

  return (
    <div
      className={cn(
        "border-border/80 bg-surface-muted/70 flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center",
        className,
      )}
    >
      {children}
      {hasActiveFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="sm:ml-auto"
          type="button"
        >
          <FilterXIcon />
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}

export interface FilterOption {
  readonly value: string;
  readonly label: string;
}

interface FilterSelectProps {
  /** Query-string key this filter controls. */
  paramKey: string;
  label: string;
  options: readonly FilterOption[];
  allLabel?: string;
  className?: string;
}

const ALL_VALUE = "__all__";

export function FilterSelect({
  paramKey,
  label,
  options,
  allLabel = "All",
  className,
}: FilterSelectProps) {
  const { getParam, setParams } = useTableParams();
  const current = getParam(paramKey);

  return (
    <Select
      value={current || ALL_VALUE}
      onValueChange={(value) => setParams({ [paramKey]: value === ALL_VALUE ? null : value })}
    >
      <SelectTrigger size="sm" aria-label={label} className={cn("sm:w-44", className)}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
