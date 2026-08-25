"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { SEARCH_DEBOUNCE_MS, TABLE_QUERY_KEYS } from "@/constants/pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useTableParams } from "@/hooks/use-table-params";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  placeholder?: string;
  className?: string;
  /** Accessible name; the visual label is the magnifier icon. */
  label?: string;
}

export function SearchInput({
  placeholder = "Search…",
  className,
  label = "Search records",
}: SearchInputProps) {
  const { getParam, setParams } = useTableParams();
  const urlValue = getParam(TABLE_QUERY_KEYS.SEARCH);
  const [value, setValue] = useState(urlValue);
  const debounced = useDebouncedValue(value, SEARCH_DEBOUNCE_MS);
  const lastPushed = useRef(urlValue);

  // Push the debounced term, but only when it differs from what is already in the
  // URL. Without the guard, a back-navigation would immediately re-push the old term.
  useEffect(() => {
    if (debounced === lastPushed.current) {
      return;
    }
    lastPushed.current = debounced;
    setParams({ [TABLE_QUERY_KEYS.SEARCH]: debounced || null });
  }, [debounced, setParams]);

  // Keep the box in sync when the URL changes from elsewhere, e.g. "clear filters".
  useEffect(() => {
    if (urlValue !== lastPushed.current) {
      lastPushed.current = urlValue;
      setValue(urlValue);
    }
  }, [urlValue]);

  return (
    <div className={cn("relative w-full sm:max-w-xs", className)}>
      <SearchIcon
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
        aria-hidden="true"
      />
      <Input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear search"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-2 -translate-y-1/2 rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <XIcon className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
