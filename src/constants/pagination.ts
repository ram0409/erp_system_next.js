export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;
export const PAGE_SIZE_OPTIONS: readonly number[] = [10, 25, 50, 100];

export const SORT_DIRECTIONS = {
  ASC: "asc",
  DESC: "desc",
} as const;

export type SortDirection = (typeof SORT_DIRECTIONS)[keyof typeof SORT_DIRECTIONS];

/** Query-string keys shared by every listing page so table state is bookmarkable. */
export const TABLE_QUERY_KEYS = {
  PAGE: "page",
  PAGE_SIZE: "pageSize",
  SEARCH: "q",
  SORT_BY: "sortBy",
  SORT_DIR: "sortDir",
  STATUS: "status",
  TYPE: "type",
  BRANCH: "branch",
  ROLE: "role",
  ACTION: "action",
  DEPARTMENT: "department",
  DESIGNATION: "designation",
  EMPLOYEE: "employee",
  PROJECT: "project",
} as const;

/** Hard cap on CSV exports so one request cannot dump the whole table. */
export const EXPORT_MAX_ROWS = 5_000;

/** Debounce applied to search inputs before a server round trip. */
export const SEARCH_DEBOUNCE_MS = 350;
