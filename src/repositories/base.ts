import "server-only";

import type { SortDirection } from "@/constants/pagination";

/**
 * Shared repository helpers.
 *
 * Soft delete is applied explicitly through `NOT_DELETED` rather than a Prisma
 * client extension. Implicit global query rewriting is the kind of magic that
 * silently leaks deleted rows the moment someone writes a raw aggregate, so the
 * filter is visible at every call site instead.
 */

/** Spread into a `where` clause to exclude soft-deleted rows. */
export const NOT_DELETED = { deletedAt: null } as const;

/** Case-insensitive partial match for search boxes. */
export function contains(term: string): { contains: string; mode: "insensitive" } {
  return { contains: term, mode: "insensitive" };
}

/** Maps the validated sort direction onto Prisma's ordering keyword. */
export function orderDirection(direction: SortDirection): "asc" | "desc" {
  return direction === "asc" ? "asc" : "desc";
}

/**
 * Builds a deterministic `orderBy`. The requested column is always followed by
 * `id`, because a non-unique sort key (a duplicated name, say) otherwise lets
 * PostgreSQL return rows in a different order per page, which makes records
 * appear twice or vanish while paging.
 */
export function orderByWithTiebreak<TField extends string>(
  field: TField,
  direction: SortDirection,
): [Record<TField, "asc" | "desc">, { id: "asc" | "desc" }] {
  const dir = orderDirection(direction);
  return [{ [field]: dir } as Record<TField, "asc" | "desc">, { id: dir }];
}

/**
 * Page + total without `BEGIN`. Neon poolers (and Vercel serverless) reject
 * Prisma's transaction protocol; these two reads do not need a shared snapshot.
 */
export function findPageAndTotal<T>(
  rows: Promise<T[]>,
  total: Promise<number>,
): Promise<[T[], number]> {
  return Promise.all([rows, total]);
}
