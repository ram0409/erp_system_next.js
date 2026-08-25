"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

import { TABLE_QUERY_KEYS } from "@/constants/pagination";

export interface TableParamUpdate {
  readonly [key: string]: string | null;
}

/**
 * Table state lives in the URL, not in component state. That makes every filtered
 * view bookmarkable and shareable, and it lets the server component re-render with
 * fresh data instead of the browser holding a second copy of the list.
 */
export function useTableParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const getParam = useCallback(
    (key: string): string => searchParams.get(key) ?? "",
    [searchParams],
  );

  const setParams = useCallback(
    (updates: TableParamUpdate, options: { resetPage?: boolean } = {}) => {
      const next = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }

      // Any change to a filter, search term or page size invalidates the current
      // page number — page 7 of the old result set is meaningless in the new one.
      if (options.resetPage !== false) {
        next.delete(TABLE_QUERY_KEYS.PAGE);
      }

      const query = next.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const clearFilters = useCallback(() => {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }, [pathname, router]);

  return { getParam, setParams, clearFilters, isPending };
}
