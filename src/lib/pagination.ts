import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  SORT_DIRECTIONS,
  TABLE_QUERY_KEYS,
  type SortDirection,
} from "@/constants/pagination";
import type {
  PaginatedResult,
  PaginationMeta,
  PaginationParams,
  RawSearchParams,
  SortParams,
} from "@/types/pagination";

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function toPositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Page size is clamped server-side. Without this, a crafted `?pageSize=1000000`
 * would let any authenticated user pull an entire table in one request.
 */
export function resolvePagination(searchParams: RawSearchParams): PaginationParams {
  const page = toPositiveInt(firstValue(searchParams[TABLE_QUERY_KEYS.PAGE]), DEFAULT_PAGE);
  const requestedSize = toPositiveInt(
    firstValue(searchParams[TABLE_QUERY_KEYS.PAGE_SIZE]),
    DEFAULT_PAGE_SIZE,
  );
  const pageSize = Math.min(requestedSize, MAX_PAGE_SIZE);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

/**
 * Sort fields are resolved against an allowlist so a query parameter can never
 * reference an arbitrary — or sensitive — column.
 */
export function resolveSort<TField extends string>(
  searchParams: RawSearchParams,
  allowedFields: readonly TField[],
  defaultField: TField,
  defaultDirection: SortDirection = SORT_DIRECTIONS.DESC,
): SortParams<TField> {
  const requestedField = firstValue(searchParams[TABLE_QUERY_KEYS.SORT_BY]);
  const requestedDir = firstValue(searchParams[TABLE_QUERY_KEYS.SORT_DIR]);

  const sortBy = allowedFields.find((field) => field === requestedField) ?? defaultField;
  const sortDir: SortDirection =
    requestedDir === SORT_DIRECTIONS.ASC
      ? SORT_DIRECTIONS.ASC
      : requestedDir === SORT_DIRECTIONS.DESC
        ? SORT_DIRECTIONS.DESC
        : defaultDirection;

  return { sortBy, sortDir };
}

export function resolveSearchTerm(searchParams: RawSearchParams): string | undefined {
  const term = firstValue(searchParams[TABLE_QUERY_KEYS.SEARCH])?.trim();
  return term ? term : undefined;
}

/** Raw query value for public-id filters (branch, role). Empty strings are dropped. */
export function resolveQueryValue(searchParams: RawSearchParams, key: string): string | undefined {
  const value = firstValue(searchParams[key])?.trim();
  return value ? value : undefined;
}

/**
 * Resolves a filter query parameter against an allowlist. Unknown values are
 * dropped rather than forwarded to the database.
 */
export function resolveAllowedValue<T extends string>(
  searchParams: RawSearchParams,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const requested = firstValue(searchParams[key]);
  if (!requested) {
    return undefined;
  }
  return allowed.find((value) => value === requested);
}

export function buildPaginationMeta(
  totalItems: number,
  { page, pageSize }: Pick<PaginationParams, "page" | "pageSize">,
): PaginationMeta {
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
}

export function buildPaginatedResult<TItem>(
  items: readonly TItem[],
  totalItems: number,
  pagination: Pick<PaginationParams, "page" | "pageSize">,
): PaginatedResult<TItem> {
  return { items, meta: buildPaginationMeta(totalItems, pagination) };
}
